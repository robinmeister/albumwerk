import { createContext, useContext } from "react";

import { Package, Price, Shooting, User } from "../../../utils/types";


type AlbumContextType = {
    shootings: Shooting[];
    setShootings: (shootings: Shooting[]) => void;
    users: User[];
    setUsers: (users: User[]) => void;
    prices: Price[];
    setPrices: (prices: Price[]) => void;
    packages: Package[];
    setPackages: (packages: Package[]) => void;
    selectedShooting: Shooting | undefined;
    setSelectedShooting: (shooting: Shooting | undefined) => void;
    selectedUsers: User[];
    setSelectedUsers: (users: User[]) => void;
    selectedPrices: Price[];
    setSelectedPrices: (prices: Price[]) => void;
    selectedPackage: Package | undefined;
    setSelectedPackage: (packageId: Package | undefined) => void;
    // bump to force the album to refetch its images
    reload: number;
    setReload: (reload: number) => void;
    openEditModal: boolean;
    setOpenEditModal: (open: boolean) => void;
    openDeleteModal: boolean;
    setOpenDeleteModal: (open: boolean) => void;
    selectMode: boolean;
    setSelectMode: (selectMode: boolean) => void;
    selected: string[];
    setSelected: (selected: string[]) => void;
    openUploadModal: boolean;
    setOpenUploadModal: (open: boolean) => void;
    handleDeleteShooting: () => void;
    setShowShooting: (show: boolean) => void;
    addPackage: boolean;
    setAddPackage: (add: boolean) => void;
};

export const AlbumContext = createContext<AlbumContextType | undefined>(undefined);

export function useAlbumContext(): AlbumContextType {
    const context = useContext(AlbumContext);
    if (!context) {
        throw new Error("useAlbumContext must be used within a AlbumProvider");
    }
    return context;
}
