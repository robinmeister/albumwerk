import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import { pb } from "../../../config/pocketbase";
import { uploadImage } from "../../../config/storage-compat";

export type UploadItemStatus = "queued" | "uploading" | "done" | "error";

export type UploadItem = {
  id: string;
  file: File;
  thumbUrl: string;
  progress: number; // 0–100
  status: UploadItemStatus;
  error?: string;
};

export type UploadPhase = "idle" | "uploading" | "processing" | "done";

export type DuplicatePrompt = {
  files: File[];
  duplicateNames: string[];
  existingIds: string[];
};

const MAX_PARALLEL_UPLOADS = 4;
const PREVIEW_TIMEOUT_MS = 2 * 60 * 1000; // watermarking large batches takes a while
const PREVIEW_RECONCILE_MS = 10_000; // safety net in case a realtime event is missed

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Upload originals to the images collection with real per-file progress and
 * bounded concurrency, then wait — via PB realtime subscription with a slow
 * reconcile fallback — until the server hook has generated a watermarked
 * preview for every uploaded file.
 */
export function useImageUpload(
  shootingId: string | undefined,
  onAllPreviewsReady?: () => void
) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [phase, setPhaseState] = useState<UploadPhase>("idle");
  const [previewProgress, setPreviewProgress] = useState<{ done: number; total: number } | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePrompt | null>(null);

  const phaseRef = useRef<UploadPhase>("idle");
  const expectedRef = useRef<Set<string>>(new Set()); // names of successfully uploaded originals
  const receivedRef = useRef<Set<string>>(new Set()); // names of previews seen so far
  const abortRef = useRef<AbortController | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcileRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbUrlsRef = useRef<string[]>([]);
  const onReadyRef = useRef(onAllPreviewsReady);
  onReadyRef.current = onAllPreviewsReady;

  const setPhase = (next: UploadPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  const clearWaiters = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (reconcileRef.current) {
      clearInterval(reconcileRef.current);
      reconcileRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearWaiters();
      thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      thumbUrlsRef.current = [];
    },
    [clearWaiters]
  );

  const recompute = useCallback(() => {
    const total = expectedRef.current.size;
    if (total === 0) return;
    let done = 0;
    expectedRef.current.forEach((name) => {
      if (receivedRef.current.has(name)) done += 1;
    });
    setPreviewProgress({ done, total });
    if (done >= total && phaseRef.current === "processing") {
      clearWaiters();
      phaseRef.current = "done";
      setPhaseState("done");
      onReadyRef.current?.();
    }
  }, [clearWaiters]);

  const reconcile = useCallback(
    async (sid: string) => {
      try {
        const recs = await pb.collection("images").getFullList({
          filter: pb.filter('shootingId={:sid} && type="preview"', { sid }),
          fields: "name",
          requestKey: null,
        });
        recs.forEach((rec: any) => receivedRef.current.add(rec.name));
        recompute();
      } catch (error) {
        console.error("Fehler beim Prüfen der Vorschauen:", error);
      }
    },
    [recompute]
  );

  const ensureSubscribed = useCallback(
    async (sid: string) => {
      if (unsubscribeRef.current) return;
      try {
        const unsubscribe = await pb.collection("images").subscribe(
          "*",
          (e) => {
            const rec = e.record as any;
            if (e.action === "create" && rec?.type === "preview" && rec?.shootingId === sid) {
              receivedRef.current.add(rec.name);
              recompute();
            }
          },
          { filter: pb.filter('shootingId={:sid} && type="preview"', { sid }) }
        );
        unsubscribeRef.current = () => void unsubscribe();
      } catch (error) {
        // realtime unavailable — the reconcile interval acts as fallback polling
        console.error("Realtime-Subscription fehlgeschlagen:", error);
      }
    },
    [recompute]
  );

  const startPreviewWaiters = useCallback(
    (sid: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (phaseRef.current !== "processing") return;
        clearWaiters();
        phaseRef.current = "done";
        setPhaseState("done");
        onReadyRef.current?.();
      }, PREVIEW_TIMEOUT_MS);
      if (!reconcileRef.current) {
        reconcileRef.current = setInterval(() => void reconcile(sid), PREVIEW_RECONCILE_MS);
      }
      void reconcile(sid);
    },
    [clearWaiters, reconcile]
  );

  const patchItem = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const setItemProgress = (id: string, progress: number) =>
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (!item || item.progress === progress) return prev;
      return prev.map((it) => (it.id === id ? { ...it, progress } : it));
    });

  const uploadOne = async (item: UploadItem, sid: string, signal: AbortSignal): Promise<boolean> => {
    if (signal.aborted) {
      patchItem(item.id, { status: "error", error: "Abgebrochen", progress: 0 });
      return false;
    }
    patchItem(item.id, { status: "uploading", progress: 0, error: undefined });
    try {
      await uploadImage({
        shootingId: sid,
        file: item.file,
        signal,
        onProgress: (fraction) => setItemProgress(item.id, Math.round(fraction * 100)),
      });
      patchItem(item.id, { status: "done", progress: 100 });
      expectedRef.current.add(item.file.name);
      return true;
    } catch (error: any) {
      const aborted = error?.name === "AbortError";
      patchItem(item.id, {
        status: "error",
        progress: 0,
        error: aborted ? "Abgebrochen" : error?.message || "Upload fehlgeschlagen",
      });
      return false;
    }
  };

  const runBatch = async (batch: UploadItem[], sid: string) => {
    setPhase("uploading");
    setPreviewProgress(null);

    const controller =
      abortRef.current && !abortRef.current.signal.aborted
        ? abortRef.current
        : new AbortController();
    abortRef.current = controller;

    await ensureSubscribed(sid);

    let failed = 0;
    let index = 0;
    const worker = async () => {
      while (index < batch.length) {
        const item = batch[index];
        index += 1;
        const ok = await uploadOne(item, sid, controller.signal);
        if (!ok) failed += 1;
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, batch.length) }, () => worker())
    );

    if (controller.signal.aborted) return;
    if (failed > 0) {
      toast.error(
        failed === 1
          ? "1 Bild konnte nicht hochgeladen werden"
          : `${failed} Bilder konnten nicht hochgeladen werden`
      );
    }
    if (expectedRef.current.size === 0) {
      setPhase("idle");
      return;
    }
    setPhase("processing");
    startPreviewWaiters(sid);
    recompute();
  };

  const enqueueFiles = (files: File[], sid: string) => {
    const newItems: UploadItem[] = files.map((file) => {
      const thumbUrl = URL.createObjectURL(file);
      thumbUrlsRef.current.push(thumbUrl);
      return { id: makeId(), file, thumbUrl, progress: 0, status: "queued" as const };
    });
    setItems((prev) => [...prev, ...newItems]);
    void runBatch(newItems, sid);
  };

  /** Entry point for dropped files: checks for name collisions first. */
  const addFiles = async (files: File[]) => {
    if (!shootingId || files.length === 0) return;
    if (phaseRef.current === "uploading" || phaseRef.current === "processing") return;

    let existing: Array<{ id: string; name: string }> = [];
    try {
      existing = (await pb.collection("images").getFullList({
        filter: pb.filter('shootingId={:sid} && type="original"', { sid: shootingId }),
        fields: "id,name",
        requestKey: null,
      })) as any;
    } catch (error) {
      // if the check fails just upload — worst case a duplicate record
      console.error("Duplikatprüfung fehlgeschlagen:", error);
    }

    const existingByName = new Map<string, string[]>();
    existing.forEach((rec) => {
      existingByName.set(rec.name, [...(existingByName.get(rec.name) ?? []), rec.id]);
    });
    const duplicateNames = [
      ...new Set(files.filter((f) => existingByName.has(f.name)).map((f) => f.name)),
    ];

    if (duplicateNames.length > 0) {
      setDuplicatePrompt({
        files,
        duplicateNames,
        existingIds: duplicateNames.flatMap((name) => existingByName.get(name) ?? []),
      });
      return;
    }
    enqueueFiles(files, shootingId);
  };

  const resolveDuplicates = async (mode: "replace" | "skip" | "cancel") => {
    const prompt = duplicatePrompt;
    setDuplicatePrompt(null);
    if (!prompt || !shootingId || mode === "cancel") return;

    if (mode === "skip") {
      const fresh = prompt.files.filter((f) => !prompt.duplicateNames.includes(f.name));
      if (fresh.length === 0) {
        toast.info("Keine neuen Dateien zum Hochladen");
        return;
      }
      enqueueFiles(fresh, shootingId);
      return;
    }

    // replace: delete the old originals (the server hook removes their
    // previews), then upload the whole batch — new previews follow on create
    try {
      for (const id of prompt.existingIds) {
        await pb.collection("images").delete(id, { requestKey: null });
      }
    } catch (error) {
      console.error("Fehler beim Ersetzen:", error);
      toast.error("Vorhandene Bilder konnten nicht ersetzt werden");
      return;
    }
    prompt.duplicateNames.forEach((name) => receivedRef.current.delete(name));
    enqueueFiles(prompt.files, shootingId);
  };

  const retryItem = (id: string) => {
    if (!shootingId || phaseRef.current === "uploading") return;
    const item = items.find((it) => it.id === id);
    if (!item || item.status !== "error") return;
    void runBatch([item], shootingId);
  };

  const cancelAll = () => {
    abortRef.current?.abort();
    clearWaiters();
    setItems((prev) =>
      prev.map((it) =>
        it.status === "queued" || it.status === "uploading"
          ? { ...it, status: "error", error: "Abgebrochen", progress: 0 }
          : it
      )
    );
    setPreviewProgress(null);
    setPhase("idle");
  };

  /** Full cleanup, e.g. when the modal closes. */
  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearWaiters();
    thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    thumbUrlsRef.current = [];
    expectedRef.current = new Set();
    receivedRef.current = new Set();
    setItems([]);
    setPreviewProgress(null);
    setDuplicatePrompt(null);
    setPhase("idle");
  };

  return {
    items,
    phase,
    previewProgress,
    duplicatePrompt,
    isBusy: phase === "uploading" || phase === "processing",
    addFiles,
    resolveDuplicates,
    retryItem,
    cancelAll,
    reset,
  };
}
