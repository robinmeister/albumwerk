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
import { getRecord, linkShootingToCurrentUser, pb } from "../../config/pocketbase";
import { getShootingCoverUrl } from "../../config/images";

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
    flexDirection: { default: "column", "@media (min-width: 600px)": "row" },
    alignItems: { default: "stretch", "@media (min-width: 600px)": "flex-end" },
    justifyContent: "space-between",
    gap: 24,
    paddingTop: 24,
    paddingBottom: 24,
    marginBottom: 40,
    borderBottom: "1px solid var(--color-border)",
  },
  headActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    alignSelf: { default: "flex-start", "@media (min-width: 600px)": "auto" },
  },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 600px)": "1fr 1fr",
      "@media (min-width: 900px)": "repeat(3, 1fr)",
    },
    gap: { default: 16, "@media (min-width: 600px)": 32 },
  },
  card: {
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--radius-container)",
    overflow: "hidden",
    cursor: "pointer",
    backgroundColor: "var(--color-background-card)",
    // Langform, nicht `border: "1px solid …"`: StyleX verwirft die
    // Allseiten-Kurzform ersatzlos (in stylex.css kommt `border:` kein
    // einziges Mal vor), gemessen als borderTopWidth 0px.
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--color-border)",
  },
  cardMedia: { aspectRatio: "4 / 3", backgroundColor: "var(--color-background-muted)" },
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
  cardCaption: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12 },
  cardTitle: { minWidth: 0 },
  // Versalien wie bisher: die Art des Albums stand schon vorher als
  // "VERKAUF" auf der Karte. `inner_text` liest den umgewandelten Text --
  // ohne diese Zeile meldet die Textprobe eine Textaenderung.
  // paddingInlineEnd: die Sperrung setzt auch hinter den letzten Buchstaben
  // noch 0.1em; ohne Ausgleich klebt das "F" von "VERKAUF" am rechten Rand
  // der Marke. --spacing-2 ist das paddingInline der Badge-Grundform.
  cardType: {
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    paddingInlineEnd: "calc(var(--spacing-2) + 0.1em)",
  },
});

// Album card, Form des Entwurfs: Cover oben im 4:3-Feld, darunter eine
// Bildunterschrift auf der Kartenfläche — Titel links, Art rechts.
//
// Die Beschriftung liegt bewusst NICHT mehr über dem Foto. Dort stand sie in
// Weiß auf einem Verlauf, den es live nie gab: StyleX verwirft die
// `background`-Kurzform ersatzlos (in stylex.css taucht ausschließlich
// `background-color` auf, kein einziges `background:`), gemessen als
// `backgroundImage: "none"` am Overlay. Weißer Text lag also ungeschützt auf
// dem Cover der Kundin — auf einem hellen Foto unlesbar, und für jede
// Kontrastprobe ein unmessbarer Grund. Auf der Kartenfläche ist der Grund ein
// Wert statt eines Bereichs und mit Token gesetzt.
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
      <div {...stylex.props(s.cardMedia)}>
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
      </div>

      <div {...stylex.props(s.cardCaption)}>
        <div {...stylex.props(s.cardTitle)}>
          <Text type="large" weight="semibold" maxLines={1}>
            {shooting.title || "Ohne Titel"}
          </Text>
        </div>
        {typeLabel[shooting.type] && (
          <Badge variant="neutral" label={typeLabel[shooting.type]} xstyle={s.cardType} />
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
      const profile = await getRecord("users", user.uid);
      if (!profile) { setLoading(false); return; }
      const ids: string[] = profile.shootingIds ?? [];
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
          {/* Einzige Aktion der Seite — also primär. */}
          <Button variant="primary" icon={<Add />} label="Album hinzufügen" onClick={() => setAddOpen(true)} />
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
