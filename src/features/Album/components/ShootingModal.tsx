import { HTMLAttributes, ReactElement, SyntheticEvent } from "react";
import {
  Autocomplete, AutocompleteRenderInputParams,
  Box,
  Button,
  CardContent,
  Dialog,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { addDoc, collection, doc, getDoc, updateDoc } from "../../../config/firestore-compat";
import { toast } from "react-toastify";
import { Close } from "@mui/icons-material";

import { useAlbumContext } from "../utils/context";
import { Package, Price, Shooting, User } from "../../../utils/types";
import { emptyShooting } from "../utils/functions";
import useMobileService from "../../../hooks/useMobileService";

export default function ShootingModal(): ReactElement {
    const {
        openEditModal,
        setOpenEditModal,
        selectedShooting,
        setSelectedShooting,
        selectedUsers,
        setSelectedUsers,
        selectedPrices,
        setSelectedPrices,
        selectedPackage,
        setSelectedPackage,
        shootings,
        setShootings,
        users,
        prices,
        packages,
        addPackage,
        setAddPackage,
    } = useAlbumContext()
    const isMobile = useMobileService()

  const updateUserShootings = async (shooting: Shooting) => {
    if (!shooting.userIds?.length) { return; }

    try {
      await Promise.all(
        (shooting.userIds ?? []).map(async (userId: string) => {
          const userDoc = doc("users", userId);
          const userDocRef = await getDoc(userDoc);

          if (userDocRef.exists()) {
            const user = userDocRef.data();
            if (user) {
              const existingShootingIds: string[] = user.shootingIds || [];
              if (!existingShootingIds.includes(shooting.id)) {
                await updateDoc(userDoc, {
                  shootingIds: [...existingShootingIds, shooting.id],
                });
              }
            }
          }
        })
      );
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Shooting-IDs:", error);
    }
  };

    const createShooting = async (shooting: Shooting) => {
      try {
          const docRef = await addDoc(collection("shootings"), shooting)
          const newShooting: Shooting = {
              id: docRef.id,
              type: shooting.type,
              title: shooting.title,
              description: shooting.description,
              packageId: shooting.packageId,
              priceIds: shooting.priceIds,
              userIds: shooting.userIds,
              withUserSelection: shooting.withUserSelection
          }
          setSelectedShooting(newShooting)
          setShootings([...shootings, newShooting])
          toast.success("Shooting erfolgreich erstellt!")
          await updateUserShootings(newShooting)
          setShootings([...shootings, newShooting])
      } catch (error) {
          console.error("Error adding document: ", error)
          toast.error("Fehler beim Erstellen des Shootings!")
      }
    }

    const updateShooting = async (shooting: Shooting | undefined) => {
        // update newShooting in db with firebase
        try {
            if(shooting === undefined) { return }
            const shootingDoc = doc("shootings", shooting.id)
            await updateDoc(shootingDoc, {
                id: shooting.id,
                type: shooting.type,
                title: shooting.title,
                description: shooting.description,
                packageId: shooting.packageId,
                priceIds: shooting.priceIds || [],
                userIds: shooting.userIds || []
            })
            // update existing shooting in shootings array
            const updatedShootings = shootings.map((s: Shooting) => s.id === shooting.id ? shooting : s)
            setShootings(updatedShootings)
            toast.success("Shooting erfolgreich aktualisiert!")
            await updateUserShootings(shooting)
        } catch (error) {
            console.error("Error updating document: ", error)
            toast.error("Fehler beim Aktualisieren des Shootings!")
        }
    }

    const handleSaveShooting = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault()
        if(selectedShooting?.id === ""){
            void createShooting(selectedShooting)
        } else {
            void updateShooting(selectedShooting)
        }
        setOpenEditModal(false)
    }


    const renderOption = (
      props: HTMLAttributes<HTMLLIElement>,
      option: User,
    ) => {
      return (
        <ListItem {...props} key={option.uid} style={{ display: 'flex', alignItems: 'center', }}>
          <ListItemText primary={`${option.firstName} ${option.lastName} (${option.email})`} />
        </ListItem>
      )
    }

    const renderModalContent = () => {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="title"
              label="Titel"
              name="title"
              value={selectedShooting?.title}
              onChange={(e) => {
                if (selectedShooting) {
                  setSelectedShooting({...selectedShooting, title: e.target.value})
                }
              }}
              autoComplete="title"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="description"
              label="Beschreibung"
              name="description"
              multiline
              rows={4}
              value={selectedShooting?.description}
              onChange={(e) => selectedShooting && setSelectedShooting({...selectedShooting, description: e.target.value})}
              autoComplete="description"
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              sx={{zIndex: 9999}}
              id="name"
              openOnFocus
              multiple
              options={users.filter((user: User) => !user.isAdmin)}
              value={selectedUsers}
              getOptionLabel={(option: User) => `${option?.firstName} ${option?.lastName}`}
              renderOption={(props: HTMLAttributes<HTMLLIElement>, option: User) => renderOption(props, option)}
              disablePortal /* List of suggestions will not be rendered on top of everything */
              onChange={(_: SyntheticEvent<Element, Event>, option: User[]) => {
                setSelectedUsers(option)
                if (selectedShooting) {
                  setSelectedShooting({...selectedShooting, userIds: option.map((user: User) => user.uid)})
                }
              }}
                renderInput={(params: AutocompleteRenderInputParams) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Kunde(n)"
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="shooting-type">Shooting Typ</InputLabel>
              <Select
                labelId="shooting-type"
                value={selectedShooting?.type}
                label="Shooting Typ"
                onChange={(e) => {
                  if (selectedShooting) {
                    setSelectedShooting({
                      ...selectedShooting,
                      packageId: "",
                      priceIds: [],
                      type: e.target.value,
                      withUserSelection: false
                    })
                    setSelectedPrices([])
                    setSelectedPackage(undefined)
                  }
                }}
                >
                  <MenuItem value={"paid"}>Bezahlt</MenuItem>
                  <MenuItem value={"public"}>Öffentlich</MenuItem>
                  <MenuItem value={"sale"}>Verkauf</MenuItem>
                </Select>
            </FormControl>
          </Grid>
          {selectedShooting?.type === "sale" && (
            <>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant={addPackage ? "outlined" : "contained"}
                  onClick={() => {
                    setSelectedShooting({...selectedShooting, packageId: "", priceIds: []})
                    setSelectedPackage(undefined)
                    setSelectedPrices([])
                    setAddPackage(false)
                  }}
                >
                  Preise
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant={!addPackage ? "outlined" : "contained"}
                  onClick={() => {
                    setSelectedShooting({...selectedShooting, packageId: "", priceIds: []})
                    setSelectedPackage(undefined)
                    setSelectedPrices([])
                    setAddPackage(true)
                  }}
                >
                  Paket
                </Button>
              </Grid>
              {!addPackage && (
                <>
                  <Grid item xs={12}>
                    <Autocomplete
                      id="prices"
                      openOnFocus
                      multiple
                      options={prices}
                      value={selectedPrices}
                      getOptionLabel={(option: Price) => option?.title}
                      renderOption={(props: HTMLAttributes<HTMLLIElement>, option: any) => {
                        return (
                          <>
                            <ListItem {...props} key={option.id} style={{ display: 'flex', alignItems: 'center', }}>
                              <ListItemText primary={`${option?.title}, ${option.amount} €`} />
                            </ListItem>
                          </>
                        )
                      }}
                      onChange={(_: SyntheticEvent<Element, Event>, option: Price[]) => {
                        setSelectedPrices(option)
                        if (selectedShooting) {
                          setSelectedShooting({...selectedShooting, priceIds: option.map((price: Price) => price.id), packageId: ""})
                        }
                      }}
                      renderInput={(params: AutocompleteRenderInputParams) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          label="Preise"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={selectedShooting?.priceIds?.length === prices.length}
                          onChange={() => {
                            if (selectedShooting?.priceIds?.length === prices.length) {
                              if (selectedShooting) {
                                setSelectedShooting({...selectedShooting, priceIds: []})
                              }
                              setSelectedPrices([])
                            } else {
                              if (selectedShooting) {
                                setSelectedShooting({...selectedShooting, priceIds: prices.map((price: Price) => price.id)})
                              }
                              setSelectedPrices(prices)
                            }
                          }}
                        />
                      }
                      label={
                        selectedShooting?.priceIds?.length === prices.length
                          ? "Alle Preise abwählen"
                          : "Alle Preise auswählen"
                      }
                    />
                  </Grid>
                </>
              )}
              {addPackage && (
                <Grid item xs={12}>
                  <Autocomplete
                    id="packages"
                    openOnFocus
                    options={packages}
                    renderOption={(props: HTMLAttributes<HTMLLIElement>, option: Package) => {
                        return (
                          <>
                            <ListItem {...props} key={option.id} style={{ display: 'flex', alignItems: 'center', }}>
                              <ListItemText primary={`${option?.title}, ${option.numberOfImages} Stk., Gesamt: ${option.totalPrice} €, Einzel: ${option.singlePrice} €/Stk.`} />
                            </ListItem>
                          </>
                        )
                    }}
                    value={selectedPackage}
                    getOptionLabel={(option: Package) => option?.title}
                    onChange={(_: SyntheticEvent<Element, Event>, option: Package | null) => {
                      if (!option) return;
                      setSelectedPackage(option)
                      if (selectedShooting) {
                        setSelectedShooting({...selectedShooting, packageId: option.id, priceIds: []})
                      }
                    }}
                    renderInput={(params: AutocompleteRenderInputParams) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Paket"
                      />
                    )}
                  />
                </Grid>
              )}
            </>
          )}
          {(selectedShooting?.type === "paid" || selectedShooting?.type === "sale") && (<Grid item xs ={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={selectedShooting?.withUserSelection}
                  onChange={() => {
                    if (selectedShooting) {
                      setSelectedShooting({...selectedShooting, withUserSelection: !selectedShooting.withUserSelection})
                    }
                  }}
                />
              }
              label="Kunden können eine Vorabauswahl treffen"
            />
          </Grid>)}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={1} sx={{ mt: 0.5 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setOpenEditModal(false);
                  setSelectedShooting(emptyShooting);
                }}
              >
                Abbrechen
              </Button>
              <Button
                variant="contained"
                onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => handleSaveShooting(event)}
              >
                Speichern
              </Button>
            </Box>
          </Grid>
        </Grid>
      )
    }

    return (
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, pt: 2.5, pb: 0 }}>
          <Typography variant="h6">
            {selectedShooting?.id ? "Shooting bearbeiten" : "Shooting erstellen"}
          </Typography>
          <IconButton onClick={() => setOpenEditModal(false)} size="small">
            <Close />
          </IconButton>
        </Box>
        <CardContent>
          {renderModalContent()}
        </CardContent>
      </Dialog>
    );
  }
