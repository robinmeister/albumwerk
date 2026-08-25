// Die Bildauswahl der Kund:in zu einem Shooting — genau ein Datensatz pro
// Shooting in der PB-Collection `userSelection`.
import { pb } from "../../../config/pocketbase";

async function findSelection(shootingId: string): Promise<any | null> {
  try {
    return await pb
      .collection("userSelection")
      .getFirstListItem(pb.filter("shootingId={:sid}", { sid: shootingId }), {
        requestKey: null,
      });
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
}

/**
 * Meldet die aktuelle Auswahl und danach jede Änderung.
 * Gibt eine Abmeldefunktion zurück.
 */
export function watchSelection(
  shootingId: string,
  onChange: (selectedImages: string[]) => void,
): () => void {
  void findSelection(shootingId).then((record) => {
    if (record) onChange(record.selectedImages ?? []);
  });

  let unsubscribe: (() => void) | undefined;
  pb.collection("userSelection")
    .subscribe("*", (event: any) => {
      if (event.record?.shootingId === shootingId) {
        onChange(event.record.selectedImages ?? []);
      }
    })
    .then((fn) => { unsubscribe = fn; })
    .catch(() => undefined);

  return () => unsubscribe?.();
}

/** Auswahl speichern — anlegen oder aktualisieren. */
export async function saveSelection(
  shootingId: string,
  selectedImages: string[],
): Promise<void> {
  const existing = await findSelection(shootingId);
  const data = {
    shootingId,
    // Die API-Regeln hängen am Eigentümer: ohne userId wird das Anlegen für
    // Kund:innen abgelehnt und der Datensatz bliebe unsichtbar.
    userId: existing?.userId || (pb.authStore.model as any)?.id || "",
    selectedImages,
    status: "pending",
  };
  if (existing) {
    await pb.collection("userSelection").update(existing.id, data);
    return;
  }
  await pb.collection("userSelection").create(data);
}
