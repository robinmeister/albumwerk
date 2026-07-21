import { ReactElement, useEffect, useState } from "react";
import { currentUser } from "../../config/currentUser";
import { doc, getDoc } from "../../config/firestore-compat";
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
import { CloudOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import Page from "../../components/layout/Page";
import DownloadForm from "../../features/Pricing/components/customer/DownloadForm";
import EmptyState from "../../components/feedback/EmptyState";
import PageLoader from "../../components/feedback/PageLoader";
import { downloadImageFromUrl } from "../../utils/functions";
import { thumbUrl } from "../../features/Album/components/AlbumImage";
import { User } from "../../utils/types";

export default function DownloadsPage(): ReactElement {
    const [userInfo, setUserInfo] = useState<User>();
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        void fetchUserInfo();
    }, []);

    async function fetchUserInfo() {
        setLoading(true);
        if(currentUser()?.uid === undefined) { return; }
        const userDoc = await getDoc(doc("users", currentUser()?.uid));
        if(userDoc.exists()) {
          const userData = userDoc.data();
          setUserInfo(userData as User);
        }
        setLoading(false);
    }

    if(loading) {
      return <PageLoader />;
    }

    if(!userInfo?.downloadableImages?.length) { return (
        <Page title="Downloads">
            <EmptyState
                icon={<CloudOff />}
                title="Noch keine Downloads"
                description="Sobald du Bilder gekauft oder freigeschaltet hast, findest du sie hier."
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
                                imageList={userInfo?.downloadableImages ? userInfo.downloadableImages : []}
                                shootingIds={userInfo?.shootingIds && userInfo.shootingIds.length > 0 ? userInfo.shootingIds : []}
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
                                {userInfo?.downloadableImages?.map((image: string) => (
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
