import { ChevronLeft as NavigateBefore, ChevronRight as NavigateNext } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Spinner } from "@astryxdesign/core/Spinner";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useEffect, useState } from "react";
import { toast } from 'react-toastify';
import { useSwipeable } from 'react-swipeable';
import { pb } from '../../../config/pocketbase';
import { getShootingCoverUrl } from '../../../config/storage-compat';

import useMobileService from '../../../hooks/useMobileService';

type Props = {
    setShootingId: (shootingId: string) => void
    shootingIds: string[]
}

const s = stylex.create({
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 400,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  track: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  card: {
    flex: 1,
    minWidth: 0,
    height: 260,
    borderRadius: "var(--radius-container)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    cursor: "pointer",
    opacity: { default: 1, ":hover": 0.85 },
    transition: "opacity 0.2s ease",
  },
  pager: { display: "flex", justifyContent: "center", marginTop: 24 },
});

export default function ShootingCarousel(props: Props): ReactElement {
    const { setShootingId, shootingIds } = props
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(false)
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
    // cards per page depends on screen size
    const isMobile = useMobileService()
    const cardsPerPage = isMobile ? 1 : 2
    const handlers = useSwipeable({
        onSwipedLeft: () => handleNextPage(),
        onSwipedRight: () => handlePrevPage(),
        trackMouse: true,
    })

    const fetchThumbnails = async (shootingIds: string[]) => {
        setLoading(true)
        const thumbnails: Record<string, string> = {}
        for (const shootingId of shootingIds) {
            try {
                const shooting = await pb.collection("shootings").getOne(shootingId, { requestKey: null })
                const url = await getShootingCoverUrl(shooting, { previewThumb: "800x0" })
                if (url) {
                    thumbnails[shootingId] = url
                }
            } catch {
                toast.error("Fehler beim Laden des Vorschaubilds")
            }
        }
        setThumbnails(prev => ({...prev, ...thumbnails}))
        setLoading(false)
    }

    useEffect(() => {
        if(shootingIds.length > 0) {
            void fetchThumbnails(shootingIds)
        }
    }, [shootingIds])

    // unique ids that actually have a thumbnail, in order
    const cardIds = Array.from(new Set(shootingIds)).filter((id) => thumbnails[id]);
    const numPages = Math.max(Math.ceil(cardIds.length / cardsPerPage), 1);

    const handleNextPage = () => {
        if (page >= numPages - 1) return;
        setPage((prevPage) => prevPage + 1);
    }

    const handlePrevPage = () => {
        if (page === 0) return;
        setPage((prevPage) => prevPage - 1);
    }

    if(loading) { return (
        <div {...stylex.props(s.loading)}>
            <Spinner size="lg" />
        </div>
    ) }

    const pageIds = cardIds.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

    return (
        <div>
            <div {...stylex.props(s.row)}>
                {!isMobile && (
                    <IconButton
                        variant="ghost"
                        icon={<NavigateBefore />}
                        label="Zurück"
                        isDisabled={page === 0}
                        onClick={handlePrevPage}
                    />
                )}
                <div {...handlers} {...stylex.props(s.track)}>
                    {pageIds.map((shootingId) => (
                        <div
                            key={shootingId}
                            {...stylex.props(s.card)}
                            style={{ backgroundImage: `url(${thumbnails[shootingId]})` }}
                            onClick={() => setShootingId(shootingId)}
                        />
                    ))}
                </div>
                {!isMobile && (
                    <IconButton
                        variant="ghost"
                        icon={<NavigateNext />}
                        label="Weiter"
                        isDisabled={page >= numPages - 1}
                        onClick={handleNextPage}
                    />
                )}
            </div>
            <div {...stylex.props(s.pager)}>
                <Pagination
                    page={page + 1}
                    totalPages={numPages}
                    siblingCount={isMobile ? 0 : 1}
                    onChange={(value) => setPage(value - 1)}
                />
            </div>
        </div>
    )
}
