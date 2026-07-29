import { ReactElement } from "react";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Switch } from "@astryxdesign/core/Switch";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading } from "@astryxdesign/core/Heading";
import * as stylex from "@stylexjs/stylex";
import { addDoc, collection, doc, getDoc, updateDoc } from "../../../config/firestore-compat";
import { toast } from "react-toastify";
import { X as Close } from "lucide-react";

import { useAlbumContext } from "../utils/context";
import { Package, Price, Shooting, User } from "../../../utils/types";
import { emptyShooting } from "../utils/functions";

const s = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  toggleRow: { display: "flex", gap: 8 },
  toggleBtn: { flex: 1 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 },
});

export default function ShootingModal(): ReactElement {
    const {
        openEditModal,
        setOpenEditModal,
        selectedShooting,
        setSelectedShooting,
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

    const handleSaveShooting = () => {
        if(selectedShooting?.id === ""){
            void createShooting(selectedShooting)
        } else {
            void updateShooting(selectedShooting)
        }
        setOpenEditModal(false)
    }

    const userOptions = users
      .filter((user: User) => !user.isAdmin)
      .map((u: User) => ({ value: u.uid, label: `${u.firstName} ${u.lastName} (${u.email})` }));
    const priceOptions = prices.map((p: Price) => ({ value: p.id, label: `${p.title}, ${p.amount} €` }));
    const packageOptions = packages.map((p: Package) => ({
      value: p.id,
      label: `${p.title}, ${p.numberOfImages} Stk., Gesamt: ${p.totalPrice} €, Einzel: ${p.singlePrice} €/Stk.`,
    }));
    const allPricesSelected =
      selectedShooting?.priceIds?.length === prices.length && prices.length > 0;

    return (
      <Dialog isOpen={openEditModal} onOpenChange={setOpenEditModal} width={560}>
        <div {...stylex.props(s.header)}>
          <Heading level={6}>
            {selectedShooting?.id ? "Shooting bearbeiten" : "Shooting erstellen"}
          </Heading>
          <IconButton
            icon={<Close />}
            label="Schließen"
            variant="ghost"
            onClick={() => setOpenEditModal(false)}
          />
        </div>

        <div {...stylex.props(s.form)}>
          <TextInput
            width="100%"
            label="Titel"
            value={selectedShooting?.title ?? ""}
            onChange={(v) => selectedShooting && setSelectedShooting({ ...selectedShooting, title: v })}
          />
          <TextArea
            width="100%"
            label="Beschreibung"
            rows={4}
            value={selectedShooting?.description ?? ""}
            onChange={(v) => selectedShooting && setSelectedShooting({ ...selectedShooting, description: v })}
          />
          <MultiSelector
            placeholder="Bitte wählen"
            width="100%"
            label="Kunde(n)"
            options={userOptions}
            value={selectedShooting?.userIds ?? []}
            onChange={(ids) => {
              setSelectedUsers(users.filter((u: User) => ids.includes(u.uid)));
              if (selectedShooting) {
                setSelectedShooting({ ...selectedShooting, userIds: ids });
              }
            }}
          />
          <Selector
            placeholder="Bitte wählen"
            width="100%"
            label="Shooting Typ"
            options={[
              { value: "paid", label: "Bezahlt" },
              { value: "public", label: "Öffentlich" },
              { value: "sale", label: "Verkauf" },
            ]}
            value={selectedShooting?.type ?? ""}
            onChange={(value) => {
              if (selectedShooting && value) {
                setSelectedShooting({
                  ...selectedShooting,
                  packageId: "",
                  priceIds: [],
                  type: value,
                  withUserSelection: false,
                });
                setSelectedPrices([]);
                setSelectedPackage(undefined);
              }
            }}
          />

          {selectedShooting?.type === "sale" && (
            <>
              <div {...stylex.props(s.toggleRow)}>
                <Button
                  xstyle={s.toggleBtn}
                  variant={addPackage ? "secondary" : "primary"}
                  label="Preise"
                  onClick={() => {
                    setSelectedShooting({ ...selectedShooting, packageId: "", priceIds: [] });
                    setSelectedPackage(undefined);
                    setSelectedPrices([]);
                    setAddPackage(false);
                  }}
                />
                <Button
                  xstyle={s.toggleBtn}
                  variant={!addPackage ? "secondary" : "primary"}
                  label="Paket"
                  onClick={() => {
                    setSelectedShooting({ ...selectedShooting, packageId: "", priceIds: [] });
                    setSelectedPackage(undefined);
                    setSelectedPrices([]);
                    setAddPackage(true);
                  }}
                />
              </div>
              {!addPackage && (
                <>
                  <MultiSelector
                    placeholder="Bitte wählen"
                    width="100%"
                    label="Preise"
                    options={priceOptions}
                    value={selectedShooting?.priceIds ?? []}
                    onChange={(ids) => {
                      setSelectedPrices(prices.filter((p: Price) => ids.includes(p.id)));
                      if (selectedShooting) {
                        setSelectedShooting({ ...selectedShooting, priceIds: ids, packageId: "" });
                      }
                    }}
                  />
                  <Switch
                    label={allPricesSelected ? "Alle Preise abwählen" : "Alle Preise auswählen"}
                    value={allPricesSelected}
                    onChange={() => {
                      if (allPricesSelected) {
                        if (selectedShooting) setSelectedShooting({ ...selectedShooting, priceIds: [] });
                        setSelectedPrices([]);
                      } else {
                        if (selectedShooting) {
                          setSelectedShooting({ ...selectedShooting, priceIds: prices.map((p: Price) => p.id) });
                        }
                        setSelectedPrices(prices);
                      }
                    }}
                  />
                </>
              )}
              {addPackage && (
                <Selector
                  placeholder="Bitte wählen"
                  width="100%"
                  label="Paket"
                  options={packageOptions}
                  value={selectedPackage?.id ?? ""}
                  onChange={(value) => {
                    const option = packages.find((p: Package) => p.id === value);
                    if (!option) return;
                    setSelectedPackage(option);
                    if (selectedShooting) {
                      setSelectedShooting({ ...selectedShooting, packageId: option.id, priceIds: [] });
                    }
                  }}
                />
              )}
            </>
          )}

          {(selectedShooting?.type === "paid" || selectedShooting?.type === "sale") && (
            <Switch
              label="Kunden können eine Vorabauswahl treffen"
              value={selectedShooting?.withUserSelection ?? false}
              onChange={() => {
                if (selectedShooting) {
                  setSelectedShooting({
                    ...selectedShooting,
                    withUserSelection: !selectedShooting.withUserSelection,
                  });
                }
              }}
            />
          )}

          <div {...stylex.props(s.actions)}>
            <Button
              variant="secondary"
              label="Abbrechen"
              onClick={() => {
                setOpenEditModal(false);
                setSelectedShooting(emptyShooting);
              }}
            />
            <Button variant="primary" label="Speichern" onClick={handleSaveShooting} />
          </div>
        </div>
      </Dialog>
    );
  }
