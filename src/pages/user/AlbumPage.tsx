import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { useSearchParams } from "react-router-dom";
import { Plus as Add, ArrowLeft as ArrowBack, Images as Collections, Images as PhotoLibrary, QrCode, Search } from "lucide-react";
import { currentUser } from "../../config/currentUser";
import { doc, getDoc } from "../../config/firestore-compat";
import { linkShootingToCurrentUser, pb } from "../../config/pocketbase";
import { getShootingCoverUrl } from "../../config/storage-compat";

import EmptyState from "../../components/feedback/EmptyState";
import Page from "../../components/layout/Page";
import Album from "../../features/Album/components/Album";
import AddShootingDialog from "../../features/Album/components/AddShootingDialog";

type ShootingInfo = {
  id: string;
  title: string;
  type: string;
  description: string;
  coverUrl: string;
};

const typeLabel: Record<string, string> = {
  paid: "Bezahlt",
  public: "Öffentlich",
  sale: "Verkauf",
};

const s = stylex.create({
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" },
  detailHead: { display: "flex", alignItems: "center", gap: 12, paddingTop: 16, paddingBottom: 8 },
  detailTitle: { minWidth: 0, flex: 1 },
  chipRight: { marginLeft: "auto" },
  overviewHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingTop: 24,
    paddingBottom: 16,
    flexWrap: "wrap",
  },
  headActions: { display: "flex", gap: 8, alignItems: "center" },
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingBlock: 80, textAlign: "center" },
  emptyIcon: { fontSize: 72, color: "var(--color-icon-disabled)" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 600px)": "1fr 1fr",
      "@media (min-width: 900px)": "repeat(3, 1fr)",
    },
    gap: 16,
  },
  card: {
    position: "relative",
    borderRadius: "var(--radius-container)",
    overflow: "hidden",
    cursor: "pointer",
    aspectRatio: "4 / 3",
    backgroundColor: "var(--color-background-muted)",
  },
  cardImg: (loaded: boolean) => ({
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    opacity: loaded ? 1 : 0,
    transition: "opacity 0.3s ease, transform 0.35s ease",
  }),
  cardPlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  placeholderIcon: { fontSize: 48, color: "var(--color-icon-disabled)" },
  cardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "40px 16px 12px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.72))",
    color: "#fff",
  },
  cardType: { letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.85, marginTop: 4, display: "block" },
});

// Album card: full-bleed cover with the title in a gradient overlay.
function AlbumCard({
  shooting,
  onClick,
}: {
  shooting: ShootingInfo;
  onClick: () => void;
}): ReactElement {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="album-card" onClick={onClick} {...stylex.props(s.card)}>
      {shooting.coverUrl ? (
        <img
          src={shooting.coverUrl}
          alt={shooting.title}
          onLoad={() => setLoaded(true)}
          {...stylex.props(s.cardImg(loaded))}
        />
      ) : (
        <div {...stylex.props(s.cardPlaceholder)}>
          <Collections {...stylex.props(s.placeholderIcon)} />
        </div>
      )}

      <div {...stylex.props(s.cardOverlay)}>
        <Text type="large" weight="semibold" maxLines={1}>
          {shooting.title || "Ohne Titel"}
        </Text>
        {typeLabel[shooting.type] && (
          <span {...stylex.props(s.cardType)}>
            <Text type="supporting">{typeLabel[shooting.type]}</Text>
          </span>
        )}
      </div>
    </div>
  );
}

export default function AlbumPage(): ReactElement {
  const [shootings, setShootings] = useState<ShootingInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // ?shootingId=… — set by the QR code flow (AddShootingPage) and by logging in
  // through a shared link. The album is already linked by then; make sure it is
  // loaded, open it, and drop the parameter so a reload does not re-trigger it.
  const requestedId = searchParams.get("shootingId") ?? "";
  const handledIdRef = useRef("");

  useEffect(() => { void fetchShootings(); }, []);

  useEffect(() => {
    if (!requestedId || loading || handledIdRef.current === requestedId) return;
    handledIdRef.current = requestedId;
    void (async () => {
      if (!shootings.some((s) => s.id === requestedId)) {
        // came straight from login: the link step has not run yet
        try {
          await linkShootingToCurrentUser(requestedId);
          await fetchShootings();
        } catch {
          /* unknown album — leave the overview as it is */
        }
      }
      setSelectedId(requestedId);
      setSearchParams({}, { replace: true });
    })();
  }, [requestedId, loading]);

  async function fetchShootings() {
    setLoading(true);
    const user = currentUser();
    if (!user) { setLoading(false); return; }
    try {
      const snap = await getDoc(doc("users", user.uid));
      if (!snap.exists()) { setLoading(false); return; }
      const ids: string[] = snap.data()?.shootingIds ?? [];
      const results: ShootingInfo[] = [];
      await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await pb.collection("shootings").getOne(id, { requestKey: null });
            results.push({
              id: r.id,
              title: r.title ?? "",
              type: r.type ?? "",
              description: r.description ?? "",
              coverUrl: await getShootingCoverUrl(r,
                { coverThumb: "800x600", previewThumb: "800x0" }),
            });
          } catch { /* shooting not found, skip */ }
        })
      );
      setShootings(results);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // the dialog has already linked the album server-side — reload and open it
  async function handleAdded(shootingId: string) {
    await fetchShootings();
    setSelectedId(shootingId);
  }

  const selectedShooting = useMemo(
    () => shootings.find((s) => s.id === selectedId),
    [shootings, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shootings.filter((s) => s.title.toLowerCase().includes(q));
  }, [shootings, search]);

  if (loading) {
    return (
      <Page>
        <div {...stylex.props(s.loading)}>
          <Spinner size="lg" />
        </div>
      </Page>
    );
  }

  // ── album detail ──
  if (selectedId && selectedShooting) {
    return (
      <Page>
        <div {...stylex.props(s.detailHead)}>
          <IconButton
            variant="ghost"
            icon={<ArrowBack />}
            label="Zurück zur Übersicht"
            onClick={() => {
              setSelectedId(undefined);
              setSelected([]);
              setSelectMode(false);
            }}
          />
          <div {...stylex.props(s.detailTitle)}>
            <Heading level={4} accessibilityLevel={1} maxLines={1}>
              {selectedShooting.title || "Ohne Titel"}
            </Heading>
            {selectedShooting.description && (
              <Text type="body" color="secondary" maxLines={1}>
                {selectedShooting.description}
              </Text>
            )}
          </div>
          {typeLabel[selectedShooting.type] && (
            <span {...stylex.props(s.chipRight)}>
              <Badge variant="neutral" label={typeLabel[selectedShooting.type]} />
            </span>
          )}
        </div>
        <Album
          isAdminAlbum={false}
          shootingId={selectedId}
          selected={selected}
          setSelected={setSelected}
          selectMode={selectMode}
          setSelectMode={setSelectMode}
        />
      </Page>
    );
  }

  // ── album overview ──
  return (
    <Page>
      <div {...stylex.props(s.overviewHead)}>
        <Heading level={3} accessibilityLevel={1}>
          Meine Alben
        </Heading>
        <div {...stylex.props(s.headActions)}>
          {shootings.length > 6 && (
            <TextInput
              label="Suchen"
              isLabelHidden
              startIcon={<Search />}
              placeholder="Suchen…"
              value={search}
              onChange={(v) => setSearch(v)}
            />
          )}
          <Button variant="secondary" icon={<Add />} label="Album hinzufügen" onClick={() => setAddOpen(true)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<PhotoLibrary />}
          title={search ? "Keine Alben gefunden." : "Noch kein Album vorhanden."}
          description={
            search
              ? undefined
              : "Scanne den QR-Code, den du von deinem Fotografen bekommen hast — dein Album erscheint dann sofort hier. Alternativ kannst du den Album-Code eingeben."
          }
          action={
            search
              ? undefined
              : {
                  label: "QR-Code scannen oder Code eingeben",
                  icon: <QrCode />,
                  onClick: () => setAddOpen(true),
                }
          }
          helpSlug={search ? undefined : "album-oeffnen"}
        />
      ) : (
        // data-testid: Ankerpunkt für die E2E-Suite (Screenshot-Zuschnitt).
        <div data-testid="albumliste" {...stylex.props(s.grid)}>
          {filtered.map((s) => (
            <AlbumCard
              key={s.id}
              shooting={s}
              onClick={() => {
                setSelectedId(s.id);
                setSelected([]);
                setSelectMode(false);
              }}
            />
          ))}
        </div>
      )}

      <AddShootingDialog
        isOpen={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(shootingId) => void handleAdded(shootingId)}
      />
    </Page>
  );
}
