import { ReactElement, useState } from "react";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Grid,
    Table,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import { CloudOff, LockOutlined } from "@mui/icons-material";
import { Location, useLocation, useNavigate } from "react-router-dom";

import Page from "../../components/layout/Page";
import DownloadForm from "../../features/Pricing/components/customer/DownloadForm";
import EmptyState from "../../components/feedback/EmptyState";
import PageLoader from "../../components/feedback/PageLoader";
import { pb } from "../../config/pocketbase";
import { downloadImageFromUrl } from "../../utils/functions";
import { thumbUrl } from "../../features/Album/components/AlbumImage";

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
        <Page title="Bilder herunterladen">
            <EmptyState
                icon={<LockOutlined />}
                title="Zum Herunterladen bitte anmelden"
                description="Die Bilder in Originalqualität sind geschützt. Melde dich kostenlos an, um deine Auswahl herunterzuladen."
                action={{ label: "Anmelden", onClick: () => navigate("/login") }}
            />
        </Page>
    ); }

    if(downloadableImages === undefined || downloadableImages.length === 0) { return (
        <Page title="Bilder herunterladen">
            <EmptyState
                icon={<CloudOff />}
                title="Keine Bilder zum Herunterladen"
                description="Öffne das Album erneut und wähle deine Bilder aus."
                action={{ label: "Zum Album", onClick: () => navigate("/album") }}
            />
        </Page>
    ); }


    return (
        <Page title="Downloads">
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Card>
                        <CardHeader title="Alle Bilder herunterladen" />
                        <CardContent>
                            <DownloadForm
                                imageList={downloadableImages ? downloadableImages : []}
                                shootingIds={shootingId ? [shootingId] : []}
                                inDownloadPage={true}
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardHeader title="Bilder einzeln herunterladen" />
                        <CardContent>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Bild</TableCell>
                                        <TableCell align="right">Herunterladen</TableCell>
                                    </TableRow>
                                </TableHead>
                                {downloadableImages?.map((image: string) => (
                                    <TableRow key={image}>
                                        <TableCell>
                                            <img
                                              alt={"Bild"}
                                              src={thumbUrl(image)}
                                              width="100"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => {
                                                    void downloadImageFromUrl(image);
                                                }}
                                            >
                                                Download
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Page>
    );
}
