import { ReactElement } from "react";
import { Add, Cancel, Edit, Save } from "@mui/icons-material";
import { Box, Card, CardContent, Grid, IconButton, TextField, Typography } from "@mui/material";

import { Package } from "../../../../utils/types";

type Props = {
  newPackage?: Package;
  setNewPackage: (newPackage: Package) => void;
  createNew: boolean;
  setCreateNew: (createNew: boolean) => void;
  editNewPackage: boolean;
  setEditNewPackage: (editNewPackage: boolean) => void;
  handleCreate: (newPackage: Package) => Promise<void>;
}

export default function PackagesCreate(props : Props): ReactElement {
  const {
    newPackage,
    handleCreate,
    createNew,
    setCreateNew,
    editNewPackage,
    setEditNewPackage,
    setNewPackage
  } = props;

  return (
    <>
    <Grid item xs={12} md={4} lg={4}>
      <Card onClick={() => {
        if(!createNew) {
          setCreateNew(true);
          setEditNewPackage(true);
          setNewPackage({
            id: "",
            title: "",
            numberOfImages: 0,
            totalPrice: "",
            singlePrice: ""
          });
        }
      }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h6">Neues Paket</Typography>
                    </Grid>
                    {createNew && (
                      <Grid item xs={6}>
                        {!editNewPackage ? (
                          <IconButton
                            sx={{ float: "right" }}
                            onClick={() => setEditNewPackage(true)}
                          >
                            <Edit />
                          </IconButton>
                        ) : (
                          <>
                            <IconButton
                              sx={{ float: "right" }}
                              onClick={() => handleCreate(newPackage as Package)}
                            >
                              <Save />
                            </IconButton>
                            <IconButton
                              sx={{ float: "right" }}
                              onClick={() => {
                                setEditNewPackage(false);
                                setCreateNew(!createNew);
                              }}
                            >
                              <Cancel />
                            </IconButton>
                          </>
                        )}
                      </Grid>
                    )}
                    {createNew ? (
                      <>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Titel"
                            name="title"
                            required
                            size="small"
                            variant="outlined"
                            value={newPackage?.title}
                            onChange={(e) => {
                              const pkg: Package = { ...(newPackage as Package) };
                              pkg.title = e.target.value;
                              setNewPackage(pkg);
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Anzahl Bilder"
                            name="numberOfImages"
                            size="small"
                            variant="outlined"
                            onChange={(e) => {
                              const pkg: Package = { ...(newPackage as Package) };
                              pkg.numberOfImages = parseInt(e.target.value);
                              setNewPackage(pkg);
                            }}
                            value={newPackage?.numberOfImages}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Paketpreis"
                            name="totalPriceText"
                            size="small"
                            variant="outlined"
                            onChange={(e) => {
                              const pkg: Package = { ...(newPackage as Package) };
                              pkg.totalPrice = e.target.value;
                              setNewPackage(pkg);
                            }}
                            value={newPackage?.totalPrice}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Einzelbildpreis"
                            name="singlePriceText"
                            size="small"
                            variant="outlined"
                            onChange={(e) => {
                              const pkg: Package = { ...(newPackage as Package) };
                              pkg.singlePrice = e.target.value;
                              setNewPackage(pkg);
                            }}
                            value={newPackage?.singlePrice}
                          />
                        </Grid>
                      </>
                    ) : (
                      <Grid
                        item
                        xs={12}
                        alignItems="center"
                        justifyContent={"center"}
                      >
                        <Box
                          sx={{minHeight: 200, minWidth: 300}}
                          alignContent="center"
                          justifyContent="center"
                          alignItems="center"
                          display="flex"
                        >
                          <Typography variant="h6">
                            <Add />
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
    </>
  )
}
