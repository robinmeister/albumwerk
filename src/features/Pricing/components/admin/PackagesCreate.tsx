import { ReactElement } from "react";
import { Plus as Add, CircleX as Cancel, Pencil as Edit, Save } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import * as stylex from "@stylexjs/stylex";

import { Package } from "../../../../utils/types";

type Props = {
  newPackage?: Package;
  setNewPackage: (newPackage: Package) => void;
  createNew: boolean;
  setCreateNew: (createNew: boolean) => void;
  editNewPackage: boolean;
  setEditNewPackage: (editNewPackage: boolean) => void;
  handleCreate: (newPackage: Package) => Promise<void>;
};

const s = stylex.create({
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    padding: 16,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  actions: { display: "flex", gap: 4 },
  placeholder: {
    minHeight: 160,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--color-text-secondary)",
    fontSize: 32,
  },
});

export default function PackagesCreate(props: Props): ReactElement {
  const {
    newPackage,
    handleCreate,
    createNew,
    setCreateNew,
    editNewPackage,
    setEditNewPackage,
    setNewPackage,
  } = props;

  return (
    <div
      {...stylex.props(s.card)}
      onClick={() => {
        if (!createNew) {
          setCreateNew(true);
          setEditNewPackage(true);
          setNewPackage({ id: "", title: "", numberOfImages: 0, totalPrice: "", singlePrice: "" });
        }
      }}
    >
      <div {...stylex.props(s.head)}>
        <Heading level={6}>Neues Paket</Heading>
        {createNew && (
          <div {...stylex.props(s.actions)}>
            {!editNewPackage ? (
              <IconButton variant="ghost" icon={<Edit />} label="Bearbeiten" onClick={() => setEditNewPackage(true)} />
            ) : (
              <>
                <IconButton variant="ghost" icon={<Save />} label="Speichern" onClick={() => handleCreate(newPackage as Package)} />
                <IconButton
                  variant="ghost"
                  icon={<Cancel />}
                  label="Abbrechen"
                  onClick={() => {
                    setEditNewPackage(false);
                    setCreateNew(!createNew);
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {createNew ? (
        <>
          <TextInput
            width="100%"
            size="sm"
            label="Titel"
            isRequired
            value={newPackage?.title ?? ""}
            onChange={(v) => setNewPackage({ ...(newPackage as Package), title: v })}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Anzahl Bilder"
            value={String(newPackage?.numberOfImages ?? "")}
            onChange={(v) => setNewPackage({ ...(newPackage as Package), numberOfImages: parseInt(v) })}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Paketpreis"
            value={newPackage?.totalPrice ?? ""}
            onChange={(v) => setNewPackage({ ...(newPackage as Package), totalPrice: v })}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Einzelbildpreis"
            value={newPackage?.singlePrice ?? ""}
            onChange={(v) => setNewPackage({ ...(newPackage as Package), singlePrice: v })}
          />
        </>
      ) : (
        <div {...stylex.props(s.placeholder)}>
          <Add />
        </div>
      )}
    </div>
  );
}
