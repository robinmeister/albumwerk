import { ReactElement } from "react";
import { Cancel, Delete, Edit, Save } from "@mui/icons-material";
import {
  Card,
  CardContent,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";

import { Package } from "../../../../utils/types";

type Props = {
  packages: Package[];
  setPackages: (packages: Package[]) => void;
  activePackage: Package;
  setActivePackage: (activePackage: Package) => void;
  handleUpdate: (pkg: Package, index: number) => Promise<void>;
  handleDelete: (pkg: Package) => Promise<void>;
  handleEdit: (index: number, type: string) => void;
  handleCancel: (index: number, type: string) => void;
  openDeleteModal: boolean;
  setOpenDeleteModal: (open: boolean) => void;
  edit: boolean[];
  setEdit: (edit: boolean[]) => void;
};

export default function PackagesEdit(props: Props): ReactElement {
  const {
    packages,
    setPackages,
    setActivePackage,
    handleUpdate,
    handleEdit,
    edit,
    handleCancel,
    setOpenDeleteModal
  } = props;

  return (
    <>
      {packages.map((pkg: Package, index) => {
        return (
          <Grid item xs={12} md={4} lg={4} key={pkg.id}>
            <form>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h6">Paket {index + 1}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      {!edit[index] && (
                        <IconButton
                          sx={{ float: "right" }}
                          onClick={() => handleEdit(index, "package")}
                        >
                          <Edit />
                        </IconButton>
                      )}
                      {edit[index] && (
                        <>
                          <IconButton
                            sx={{ float: "right" }}
                            onClick={() => handleUpdate(pkg, index)}
                          >
                            <Save />
                          </IconButton>
                          <IconButton
                            sx={{ float: "right" }}
                            onClick={() => handleCancel(index, "package")}
                          >
                            <Cancel />
                          </IconButton>
                        </>
                      )}
                      <IconButton
                        sx={{ float: "right" }}
                        onClick={() => {
                          setActivePackage(pkg);
                          setOpenDeleteModal(true)
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Titel"
                        name="title"
                        required
                        size="small"
                        variant="outlined"
                        value={pkg?.title}
                        onChange={(e) => {
                          const newPackages = [...packages];
                          newPackages[index].title = e.target.value;
                          setPackages(newPackages);
                        }}
                        disabled={!edit[index]}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Anzahl Bilder"
                        name="numberOfImages"
                        size="small"
                        variant="outlined"
                        onChange={(e) => {
                          const newPackages = [...packages];
                          newPackages[index].numberOfImages = parseInt(e.target.value);
                          setPackages(newPackages);
                        }}
                        value={pkg.numberOfImages}
                        disabled={!edit[index]}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Paketpreis"
                        name="totalPriceText"
                        size="small"
                        variant="outlined"
                        onChange={(e) => {
                          const newPackages = [...packages];
                          newPackages[index].totalPrice = e.target.value;
                          setPackages(newPackages);
                        }}
                        value={pkg.totalPrice}
                        disabled={!edit[index]}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Einzelner Preis"
                        name="singlePriceText"
                        size="small"
                        variant="outlined"
                        onChange={(e) => {
                          const newPackages = [...packages];
                          newPackages[index].singlePrice = e.target.value;
                          setPackages(newPackages);
                        }}
                        value={pkg.singlePrice}
                        disabled={!edit[index]}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </form>
          </Grid>
        );
      })}
    </>
  );
}
