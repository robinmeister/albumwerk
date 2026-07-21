import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { Box, Card, CardMedia, CircularProgress, Grid, IconButton, Pagination, Slide, Stack } from '@mui/material';
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

export default function ShootingCarousel(props: Props): ReactElement {
    const { setShootingId, shootingIds } = props
    const [cards, setCards] = useState<ReactElement[]>([])
    const [page, setPage] = useState(0)
    const [slideDirection, setSlideDirection] = useState<"left" | "right" | undefined>("left")
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

    useEffect(() => {
        if(Object.keys(thumbnails).length === 0) { return }
        setCards(shootingCards(shootingIds))
    }, [thumbnails, shootingIds])

    const handleNextPage = () => {
        if(page >= Math.ceil(cards.length / cardsPerPage) - 1) { return }
        setSlideDirection("left")
        setPage((prevPage) => prevPage + 1)
    }

    const handlePrevPage = () => {
        if(page === 0) { return }
        setSlideDirection("right")
        setPage((prevPage) => prevPage - 1)
    }

    const shootingCards = (shootingIds: string[]): ReactElement[] => {
      // remove duplicates
      const uniqueIds = Array.from(new Set(shootingIds));
      const cards: ReactElement[] = [];
      for (const shootingId of uniqueIds) {
        const thumbnail = thumbnails[shootingId];
        if (!thumbnail) continue;

        cards.push(
          <Card
            key={shootingId}
            sx={{
              height: "auto",
              width: "auto",
              backgroundImage: `url(${thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              "&:hover": {
                cursor: "pointer",
                opacity: 0.8,
              },
            }}
            onClick={() => setShootingId(shootingId)}
          >
            <CardMedia
              component="img"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0,
              }}
              image={thumbnail}
              title="shooting"
              onLoad={() => setLoading(false)}
              onError={() => {
                toast.error("Error loading image");
                setLoading(false);
              }}
            />
          </Card>
        );
      }

      return cards;
    };

    if(loading) { return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                alignContent: 'center',
                justifyContent: 'center',
                height: "400px"
            }}
        >
            <CircularProgress />
        </Box>
    ) }

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignContent: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {!isMobile && (
                        <IconButton
                            onClick={handlePrevPage}
                            disabled={page === 0}
                            sx={{ margin: 2, padding: 2, "& svg": { fontSize: 36 } }}
                        >
                            <NavigateBefore />
                        </IconButton>
                    )}
                    <Box
                        {...handlers}
                        sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignContent: 'center',
                            justifyContent: 'center',
                            height: "auto",
                            width: "auto",
                        }}
                    >
                        {cards.map((card: ReactElement, index: number) => (
                            <Box
                                key={card.key}
                                sx={{
                                    width: "100%",
                                    height: "100%",
                                    display: page === index ? "block" : "none",
                                }}
                            >
                                <Slide direction={slideDirection} in={page === index}>
                                    <Stack
                                        spacing={2}
                                        direction="row"
                                        alignContent="center"
                                        justifyContent="center"
                                    >
                                        {cards.slice(index * cardsPerPage, index * cardsPerPage + cardsPerPage)}
                                    </Stack>
                                </Slide>
                            </Box>
                        ))}
                    </Box>
                    {!isMobile && (
                        <IconButton
                            onClick={handleNextPage}
                            disabled={page >= Math.ceil(cards.length || 0) / cardsPerPage - 1}
                            sx={{ margin: 2, padding: 2, "& svg": { fontSize: 36 } }}
                        >
                            <NavigateNext />
                        </IconButton>
                    )}
                </Box>
            </Grid>
            <Grid item xs={12}>
                <Pagination
                    count={Math.ceil(cards.length / cardsPerPage)}
                    page={page + 1}
                    onChange={(event, value) => setPage(value - 1)}
                    color="primary"
                    siblingCount={isMobile ? 0 : 1}
                    sx={{
                        margin: 5,
                        // center pagination
                        display: "flex",
                        justifyContent: "center",
                        marginTop: "auto"
                    }}
                />
            </Grid>
        </Grid>
    )
}
