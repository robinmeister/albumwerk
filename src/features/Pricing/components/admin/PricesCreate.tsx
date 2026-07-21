import { ReactElement } from "react";
import { Add, Cancel, Edit, Save } from "@mui/icons-material";
import { Box, Card, CardContent, Grid, IconButton, TextField, Typography } from "@mui/material";

import { Price } from "../../../../utils/types";

type Props = {
  newPrice?: Price;
  setNewPrice: (newPrice: Price) => void;
  createNewPrice: boolean;
  setCreateNewPrice: (createNew: boolean) => void;
  editNewPrice: boolean;
  setEditNewPrice: (editNewPrice: boolean) => void;
  handleCreate: (price: Price) => Promise<void>;
}

export default function PriceCreate(props : Props): ReactElement {
  const {
    setNewPrice,
    handleCreate,
    newPrice,
    createNewPrice,
    setCreateNewPrice,
    editNewPrice,
    setEditNewPrice,
  } = props;

  return (
    <>
    <Grid item xs={12} md={4} lg={4}>
              <Card onClick={() => {
                if(!createNewPrice) {
                  setCreateNewPrice(true);
                  setEditNewPrice(true);
                  setNewPrice({
                    id: "",
                    title: "",
                    amount: "",
                    description: "",
                    isDownloadable: false,
                  });
              }
              }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h6">Neuer Einzelpreis</Typography>
                    </Grid>
                    {createNewPrice && (
                      <Grid item xs={6}>
                        {!editNewPrice ? (
                          <IconButton
                            sx={{ float: "right" }}
                            onClick={() => setEditNewPrice(true)}
                          >
                            <Edit />
                          </IconButton>
                        ) : (
                          <>
                            <IconButton
                              sx={{ float: "right" }}
                              onClick={() => handleCreate(newPrice as Price)}
                            >
                              <Save />
                            </IconButton>
                            <IconButton
                              sx={{ float: "right" }}
                              onClick={() => {
                                setEditNewPrice(false);
                                setCreateNewPrice(!createNewPrice);
                              }}
                            >
                              <Cancel />
                            </IconButton>
                          </>
                        )}
                      </Grid>
                    )}
                    {createNewPrice ? (
                      <>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Titel"
                            name="title"
                            required
                            size="small"
                            variant="outlined"
                            value={newPrice?.title}
                            onChange={(e) => {
                              const price: Price = { ...(newPrice as Price) };
                              price.title = e.target.value;
                              setNewPrice(price);
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            type={"number"}
                            label="Preis"
                            name="price"
                            required
                            size="small"
                            variant="outlined"
                            onChange={(e) => {
                              const price: Price = { ...(newPrice as Price) };
                              price.amount = e.target.value;
                              setNewPrice(price);
                            }}
                            value={newPrice?.amount}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Beschreibung"
                            name="description"
                            required
                            multiline
                            size="small"
                            variant="outlined"
                            onChange={(e) => {
                              if (newPrice) {
                                setNewPrice({ ...newPrice, description: e.target.value })
                              }
                            }}
                            value={newPrice?.description}
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
