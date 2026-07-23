import { IconButton } from "@astryxdesign/core/IconButton";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import {
  Fragment,
  ReactElement,
  useEffect,
  useState,
} from "react";
import { collection, doc, getDoc, getDocs } from "../../../config/firestore-compat";
import { Plus as Add, Trash2 as Delete, Pencil as Edit, Search, Upload } from "lucide-react";
import { getDownloadURL, list, ref } from "../../../config/storage-compat";

import { Shooting } from "../../../utils/types";
import { useAlbumContext } from "../utils/context";
import { emptyShooting } from "../utils/functions";
import useMobileService from "../../../hooks/useMobileService";
import DeleteModal from "../../../components/widgets/DeleteModal";

const s = stylex.create({
  search: { maxWidth: 500, margin: "0 auto 16px" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 600px)": "1fr 1fr",
      "@media (min-width: 900px)": "repeat(3, 1fr)",
      "@media (min-width: 1200px)": "repeat(4, 1fr)",
    },
    gap: 16,
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    overflow: "hidden",
    backgroundColor: "var(--color-background-card)",
    cursor: "pointer",
    boxShadow: { default: "none", ":hover": "0 4px 16px rgba(0,0,0,0.16)" },
  },
  cardActive: { boxShadow: "0 4px 16px rgba(0,0,0,0.16)" },
  media: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 140,
    backgroundColor: "var(--color-background-muted)",
  },
  mediaImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  title: { padding: "12px 16px", flex: 1 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 4, padding: "0 8px 8px" },
  addCard: {
    height: "100%",
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: "var(--radius-container)",
    border: "1px dashed var(--color-border)",
    cursor: "pointer",
    backgroundColor: { default: "transparent", ":hover": "var(--color-overlay-hover)" },
  },
  addIcon: { fontSize: 40, color: "var(--color-text-secondary)" },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
  pager: { display: "flex", justifyContent: "center", marginTop: 20 },
});

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

  const handleSearch = (val: string) => {
    setInputValue(val);
    if (val === "") {
      setFilteredShootings(
        shootings
          .sort((a: Shooting, b: Shooting) => a?.title.localeCompare(b?.title))
          .slice((page - 1) * (isMobile ? 2 : 9), page * (isMobile ? 2 : 9))
      );
      return;
    }
    setFilteredShootings(
      shootings.filter((shooting) =>
        shooting?.title.toLowerCase().includes(val.toLowerCase())
      )
    );
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

  const shootingDisplay = (shooting: Shooting) => {
    const thumbReady = loadingThumbnails[shooting.id];
    return (
      <div {...stylex.props(s.card, selectedShooting?.id === shooting.id && s.cardActive)}>
        <div
          {...stylex.props(s.media)}
          onClick={() => {
            setShowShooting(true);
            setSelectedShooting(shooting);
          }}
        >
          {thumbReady && thumbnails[shooting.id] ? (
            <img src={thumbnails[shooting.id]} alt={shooting?.title} {...stylex.props(s.mediaImg)} />
          ) : (
            <Spinner size="sm" />
          )}
        </div>
        <div {...stylex.props(s.title)}>
          <Text type="body" weight="medium">{shooting?.title}</Text>
        </div>
        <div {...stylex.props(s.actions)}>
          <IconButton
            variant="ghost"
            icon={<Delete />}
            label="Löschen"
            tooltip="Löschen"
            onClick={() => {
              setShowShooting(false);
              setSelectedShooting(shooting);
              setOpenDeleteModal(true);
            }}
          />
          <IconButton
            variant="ghost"
            icon={<Edit />}
            label="Bearbeiten"
            tooltip="Bearbeiten"
            onClick={() => {
              setShowShooting(false);
              void handleEditShooting(shooting);
            }}
          />
          <IconButton
            variant="ghost"
            icon={<Upload />}
            label="Bilder hochladen"
            tooltip="Bilder hochladen"
            onClick={() => {
              setShowShooting(false);
              setSelectedShooting(shooting);
              setOpenUploadModal(true);
            }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div {...stylex.props(s.loading)}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div {...stylex.props(s.search)}>
        <TextInput
          label="Suche nach Shooting"
          isLabelHidden
          width="100%"
         
          startIcon={<Search />}
          placeholder="Suche nach Shooting"
          value={inputValue}
          onChange={handleSearch}
        />
      </div>
      <div {...stylex.props(s.grid)}>
        {filteredShootings.map((shooting: Shooting) => (
          <Fragment key={shooting.id}>{shootingDisplay(shooting)}</Fragment>
        ))}
        <div
          {...stylex.props(s.addCard)}
          onClick={() => {
            setShowShooting(false);
            setSelectedShooting(emptyShooting);
            setSelectedPrices([]);
            setSelectedUsers([]);
            setSelectedPackage(undefined);
            setOpenEditModal(true);
          }}
        >
          <Add {...stylex.props(s.addIcon)} />
          <Text type="body" color="secondary">Neues Shooting</Text>
        </div>
      </div>
      <div {...stylex.props(s.pager)}>
        <Pagination page={page} totalPages={numPages} onChange={(value) => setPage(value)} />
      </div>
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
