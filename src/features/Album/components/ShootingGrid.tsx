import {
  Autocomplete, AutocompleteRenderInputParams,
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Pagination,
  TextField
} from "@mui/material";
import {
  Fragment,
  ReactElement,
  SyntheticEvent,
  useEffect,
  useState,
} from "react";
import { collection, doc, getDoc, getDocs } from "../../../config/firestore-compat";
import { Add, Delete, Edit, Search, Upload } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { getDownloadURL, list, ref } from "../../../config/storage-compat";

import { Shooting } from "../../../utils/types";
import { useAlbumContext } from "../utils/context";
import { emptyShooting } from "../utils/functions";
import useMobileService from "../../../hooks/useMobileService";
import DeleteModal from "../../../components/widgets/DeleteModal";

export default function ShootingGrid(): ReactElement {
  const {
    selectedShooting,
    setSelectedShooting,
    setSelectedPrices,
    setSelectedUsers,
    setSelectedPackage,
    shootings,
    setShootings,
    users,
    prices,
    packages,
    setOpenEditModal,
    setOpenUploadModal,
    handleDeleteShooting,
    setShowShooting,
  } = useAlbumContext();
  const isMobile = useMobileService();
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [filteredShootings, setFilteredShootings] = useState<Shooting[]>(shootings);
  const [loading, setLoading] = useState(false);
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<string, boolean>>({});
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    void fetchShootings();
  }, []);

  useEffect(() => {
    if (shootings.length > 0) {
      void fetchThumbnails(shootings);
      setFilteredShootings(
        shootings.slice(
          (page - 1) * (isMobile ? 2 : 9),
          page * (isMobile ? 2 : 9)
        )
      );
      setNumPages(Math.ceil(shootings.length / (isMobile ? 2 : 9)));
    }
  }, [shootings]);

  useEffect(() => {
    setFilteredShootings(
      shootings.slice(
        (page - 1) * (isMobile ? 2 : 9),
        page * (isMobile ? 2 : 9)
      )
    );
  }, [page]);

  const fetchThumbnails = async (shootings: Shooting[]) => {
    // fetch thumbnails from storage

    const initialLoadingThumbnails: Record<string, boolean> = {};
    shootings.forEach((shooting) => {
      initialLoadingThumbnails[shooting.id] = false;
    });
    setLoadingThumbnails(initialLoadingThumbnails);
    const thumbnails: Record<string, string> = {};

    const promises = shootings.map(async (shooting) => {
      const listRef = ref(`shootings/${shooting.id}/preview`);
      const imageUrls = await list(listRef, { maxResults: 1 });
      if (imageUrls.items.length > 0) {
        thumbnails[shooting.id] = await getDownloadURL(imageUrls.items[0]);
      }
      setLoadingThumbnails((prev) => ({
        ...prev,
        [shooting.id]: true,
      }));
    });

    await Promise.all(promises);
    setThumbnails(thumbnails);
  };

  const fetchShootings = async () => {
    // fetch shootings from db
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection("shootings"));
      const shootings: Shooting[] = [];
      querySnapshot.forEach((doc) => {
        const shooting: Shooting = {
          id: doc.id,
          type: doc.data().type,
          title: doc.data().title,
          description: doc.data().description,
          priceIds: doc.data().priceIds,
          packageId: doc.data().packageId,
          userIds: doc.data().userIds,
          withUserSelection: doc.data().withUserSelection,
        };
        shootings.push(shooting);
      });
      setNumPages(Math.ceil(shootings.length / (isMobile ? 2 : 9)));
      setShootings(shootings);
      setFilteredShootings(
        shootings
          .sort((a: Shooting, b: Shooting) => a?.title.localeCompare(b?.title))
          .slice((page - 1) * (isMobile ? 2 : 9), page * (isMobile ? 2 : 9))
      );
    } catch (error) {
      console.error("Error getting documents: ", error);
    }
    setLoading(false);
  };

  const handleEditShooting = async (shooting: Shooting) => {
    setLoading(true);
    const shootingRef = doc("shootings", shooting.id);
    const shootingDoc = await getDoc(shootingRef);
    const newShooting = {
      id: shooting.id,
      type: shootingDoc.data()?.type,
      title: shootingDoc.data()?.title,
      description: shootingDoc.data()?.description,
      packageId: shootingDoc.data()?.packageId,
      priceIds: shootingDoc.data()?.priceIds,
      userIds: shootingDoc.data()?.userIds,
      withUserSelection: shootingDoc.data()?.withUserSelection,
    };
    setSelectedShooting(newShooting);
    setSelectedPrices(
      prices.filter((price) => (newShooting.priceIds ?? []).includes(price.id))
    );
    setSelectedUsers(
      users.filter((user) => (newShooting.userIds ?? []).includes(user.uid))
    );
    setSelectedPackage(
      packages.find((package_) => package_.id === newShooting.packageId)
    );
    setLoading(false);
    setOpenEditModal(true);
  };

  const shootingDisplay = (shooting: Shooting, image: string) => {
    return (
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Card
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            "&:hover": {
              boxShadow: "3px 3px 5px 6px #ccc", // Add shadow on hover
              cursor: "pointer", // Change cursor to pointer on hover
            },
            boxShadow:
              selectedShooting?.id === shooting.id
                ? "3px 3px 5px 6px #ccc"
                : "",
          }}
        >
            <Box
              onClick={() => {
                  setShowShooting(true);
                  setSelectedShooting(shooting);
              }}
              sx={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "140px",
                  backgroundColor: !loadingThumbnails[shooting.id] ? "#f0f0f0" : undefined,
              }}
            >
                <CardMedia
                  component="img"
                  height="140"
                  image={
                      !loadingThumbnails[shooting.id]
                        ? "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" // Placeholder image
                        : thumbnails[shooting.id] || image
                  }
                  alt={shooting?.title}
                  sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                  }}
                />
                {!loadingThumbnails[shooting.id] && <CircularProgress size={24} />}
            </Box>
          <CardContent>{shooting?.title}</CardContent>
          <CardActions sx={{ justifyContent: "flex-end", pt: 0, gap: 0.5 }}>
            <Tooltip title="Löschen">
              <IconButton
                size="medium"
                onClick={() => {
                  setShowShooting(false);
                  setSelectedShooting(shooting);
                  setOpenDeleteModal(true);
                }}
                aria-label="delete"
              >
                <Delete />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bearbeiten">
              <IconButton
                size="medium"
                onClick={() => {
                  setShowShooting(false);
                  void handleEditShooting(shooting);
                }}
                aria-label="edit"
              >
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bilder hochladen">
              <IconButton
                size="medium"
                onClick={() => {
                  setShowShooting(false);
                  setSelectedShooting(shooting);
                  setOpenUploadModal(true);
                }}
                aria-label="upload"
              >
                <Upload />
              </IconButton>
            </Tooltip>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  if (loading)
    { return (
      <CircularProgress
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          marginTop: "-50px",
          marginLeft: "-50px",
        }}
      />
    ); }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
          <Autocomplete
            freeSolo
            id="search-input-shootings"
            disableClearable
            sx={{
              maxWidth: "500px",
              margin: "auto",
            }}
            value={value!}
            onChange={(event: SyntheticEvent<Element, Event>, newValue: string | null) => {
              setValue(newValue);
            }}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
              if (newInputValue === "")
                { return setFilteredShootings(
                  shootings
                    .sort((a: Shooting, b: Shooting) =>
                      a?.title.localeCompare(b?.title)
                    )
                    .slice(
                      (page - 1) * (isMobile ? 2 : 9),
                      page * (isMobile ? 2 : 9)
                    )
                ); }
              setFilteredShootings(
                shootings.filter((shooting) =>
                  shooting?.title
                    .toLowerCase()
                    .includes(newInputValue.toLowerCase())
                )
              );
            }}
            options={shootings.map((shooting) => shooting?.title)}
            renderInput={(params: AutocompleteRenderInputParams) => (
              <TextField
                {...params}
                label="Suche nach Shooting"
                InputProps={{
                  ...params.InputProps,
                  type: "search",
                  endAdornment: (
                    <InputAdornment position="end">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Grid>
        {filteredShootings.map((shooting: Shooting) => (
          <Fragment key={shooting.id}>
            {shootingDisplay(
              shooting,
              "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
            )}
          </Fragment>
        ))}
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card
            onClick={() => {
              setShowShooting(false);
              setSelectedShooting(emptyShooting);
              setSelectedPrices([]);
              setSelectedUsers([]);
              setSelectedPackage(undefined);
              setOpenEditModal(true);
            }}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              "&:hover": {
                boxShadow: "3px 3px 5px 6px #ccc", // Add shadow on hover
                cursor: "pointer", // Change cursor to pointer on hover
              },
            }}
          >
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "50px",
                    }}
                  >
                    <Add sx={{ fontSize: 40 }} />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Neues Shooting
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={12} md={12} lg={12}>
          <Pagination
            count={numPages}
            color="primary"
            page={page}
            sx={{
              display: "flex",
              justifyContent: "center",
              marginTop: "20px",
            }}
            onChange={(event, value) => {
              setPage(value);
              /* setFilteredShootings(shootings.slice((value - 1) * (isMobile ? 2 : 9), value * (isMobile ? 2 : 9))) */
            }}
          />
        </Grid>
      </Grid>
      <DeleteModal
        name={selectedShooting?.title ?? ""}
        open={openDeleteModal}
        setOpen={() => setOpenDeleteModal(false)}
        onDelete={() => {
          handleDeleteShooting();
          setOpenDeleteModal(false);
        }}
      />
    </>
  );
}
