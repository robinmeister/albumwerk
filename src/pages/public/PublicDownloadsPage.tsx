import { ReactElement, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import * as stylex from "@stylexjs/stylex";
import { CloudOff, Lock as LockOutlined } from "lucide-react";
import { Location, useLocation, useNavigate } from "react-router-dom";

import Page from "../../components/layout/Page";
import DownloadForm from "../../features/Pricing/components/customer/DownloadForm";
import EmptyState from "../../components/feedback/EmptyState";
import PageLoader from "../../components/feedback/PageLoader";
import { pb } from "../../config/pocketbase";
import { downloadImageFromUrl } from "../../utils/functions";
import { thumbUrl } from "../../features/Album/components/AlbumImage";

const s = stylex.create({
  // Diese Seite laeuft ueber `EmptyLayout` (kein `AppShell`, s. App.tsx) und
  // hatte deshalb bisher gar keine Breitenbegrenzung — die Karten liefen
  // randlos ueber die volle Fensterbreite. Der Entwurf (downloads-desktop
  // .html) zentriert den Inhalt in einem `max-w-[1076px]`-Container mit
  // Seitenabstand; uebernommen wird hier nicht dieser Pixelwert, sondern die
  // Breite, die `AppShell` fuer eingeloggte Kundinnen ohnehin schon benutzt
  // (`CONTENT_MAX_WIDTH.lg = 1200`, `padding: 16px` in AppShell.tsx) — damit
  // `/publicDownloads` und `/downloads` (Aufgabe 7, dieselbe Sache fuer eine
  // andere Rolle) gleich breit erscheinen, statt zwei verschiedene Werte zu
  // erfinden.
  container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: 16 },
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    fontWeight: 600,
    fontSize: 14,
  },
  thRight: { textAlign: "right" },
  td: { padding: "8px 12px", borderBottom: "1px solid var(--color-border)" },
  tdRight: { textAlign: "right" },
  thumb: { width: 100, borderRadius: "var(--radius-element)" },
});

export default function DownloadsPage(): ReactElement {
    const location: Location = useLocation();
    const navigate = useNavigate();
    // location.state is lost on refresh/direct link — fall back gracefully
    const state = (location.state ?? {}) as { shootingId?: string; selectedImages?: string[] };
    const [shootingId] = useState<string>(state.shootingId ?? "");
    const [loading] = useState<boolean>(false);
    const [downloadableImages] = useState<string[]>(state.selectedImages ?? []);

    if(loading) { return <PageLoader />; }

    // Originals are token-protected (migration 1784600007) — downloading
    // requires a signed-in account. Previews/galleries stay public.
    if (!pb.authStore.isValid) { return (
        <div {...stylex.props(s.container)}>
        <Page title="Bilder herunterladen">
            <EmptyState
                icon={<LockOutlined />}
                title="Zum Herunterladen bitte anmelden"
                description="Die Bilder in Originalqualität sind geschützt. Melde dich kostenlos an, um deine Auswahl herunterzuladen."
                action={{ label: "Anmelden", onClick: () => navigate("/login") }}
            />
        </Page>
        </div>
    ); }

    if(downloadableImages === undefined || downloadableImages.length === 0) { return (
        <div {...stylex.props(s.container)}>
        <Page title="Bilder herunterladen">
            <EmptyState
                icon={<CloudOff />}
                title="Keine Bilder zum Herunterladen"
                description="Öffne das Album erneut und wähle deine Bilder aus."
                action={{ label: "Zum Album", onClick: () => navigate("/album") }}
            />
        </Page>
        </div>
    ); }

    return (
        <div {...stylex.props(s.container)}>
        <Page title="Downloads">
            <div {...stylex.props(s.stack)}>
                <div {...stylex.props(s.card)}>
                    <Heading level={5}>Alle Bilder herunterladen</Heading>
                    <DownloadForm
                        imageList={downloadableImages ? downloadableImages : []}
                        shootingIds={shootingId ? [shootingId] : []}
                        inDownloadPage={true}
                    />
                </div>
                <div {...stylex.props(s.card)}>
                    <Heading level={5}>Bilder einzeln herunterladen</Heading>
                    <table {...stylex.props(s.table)}>
                        <thead>
                            <tr>
                                <th {...stylex.props(s.th)}>Bild</th>
                                <th {...stylex.props(s.th, s.thRight)}>Herunterladen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {downloadableImages?.map((image: string) => (
                                <tr key={image}>
                                    <td {...stylex.props(s.td)}>
                                        <img alt="Bild" src={thumbUrl(image)} {...stylex.props(s.thumb)} />
                                    </td>
                                    <td {...stylex.props(s.td, s.tdRight)}>
                                        <Button
                                            variant="primary"
                                            label="Download"
                                            onClick={() => {
                                                void downloadImageFromUrl(image);
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Page>
        </div>
    );
}
