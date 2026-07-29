import { ReactElement, useEffect, useState } from "react";
import { currentUser } from "../../config/currentUser";
import { doc, getDoc } from "../../config/firestore-compat";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import * as stylex from "@stylexjs/stylex";
import { CloudOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Page from "../../components/layout/Page";
import DownloadForm from "../../features/Pricing/components/customer/DownloadForm";
import EmptyState from "../../components/feedback/EmptyState";
import PageLoader from "../../components/feedback/PageLoader";
import { downloadImageFromUrl } from "../../utils/functions";
import { thumbUrl } from "../../features/Album/components/AlbumImage";
import { User } from "../../utils/types";

const s = stylex.create({
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
                helpSlug="downloads-nutzen"
            />
        </Page>
    ); }

    return (
        <Page title="Downloads">
            <div {...stylex.props(s.stack)}>
                <div {...stylex.props(s.card)}>
                    <Heading level={5}>Alle Bilder herunterladen</Heading>
                    <DownloadForm
                        imageList={userInfo?.downloadableImages ? userInfo.downloadableImages : []}
                        shootingIds={userInfo?.shootingIds && userInfo.shootingIds.length > 0 ? userInfo.shootingIds : []}
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
                            {userInfo?.downloadableImages?.map((image: string) => (
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
    );
}
