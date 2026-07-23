import { ReactElement } from "react";
import { CircleX as Cancel, Trash2 as Delete, Pencil as Edit, Save } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import * as stylex from "@stylexjs/stylex";

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

const s = stylex.create({
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  actions: { display: "flex", gap: 4 },
});

export default function PackagesEdit(props: Props): ReactElement {
  const {
    packages,
    setPackages,
    setActivePackage,
    handleUpdate,
    handleEdit,
    edit,
    handleCancel,
    setOpenDeleteModal,
  } = props;

  return (
    <>
      {packages.map((pkg: Package, index) => (
        <div key={pkg.id} {...stylex.props(s.card)}>
          <div {...stylex.props(s.head)}>
            <Heading level={6}>Paket {index + 1}</Heading>
            <div {...stylex.props(s.actions)}>
              {!edit[index] && (
                <IconButton variant="ghost" icon={<Edit />} label="Bearbeiten" onClick={() => handleEdit(index, "package")} />
              )}
              {edit[index] && (
                <>
                  <IconButton variant="ghost" icon={<Save />} label="Speichern" onClick={() => handleUpdate(pkg, index)} />
                  <IconButton variant="ghost" icon={<Cancel />} label="Abbrechen" onClick={() => handleCancel(index, "package")} />
                </>
              )}
              <IconButton
                variant="ghost"
                icon={<Delete />}
                label="Löschen"
                onClick={() => {
                  setActivePackage(pkg);
                  setOpenDeleteModal(true);
                }}
              />
            </div>
          </div>
          <TextInput
            width="100%"
            size="sm"
            label="Titel"
            isRequired
            isDisabled={!edit[index]}
            value={pkg?.title ?? ""}
            onChange={(v) => {
              const newPackages = [...packages];
              newPackages[index].title = v;
              setPackages(newPackages);
            }}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Anzahl Bilder"
            isDisabled={!edit[index]}
            value={String(pkg.numberOfImages ?? "")}
            onChange={(v) => {
              const newPackages = [...packages];
              newPackages[index].numberOfImages = parseInt(v);
              setPackages(newPackages);
            }}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Paketpreis"
            isDisabled={!edit[index]}
            value={pkg.totalPrice ?? ""}
            onChange={(v) => {
              const newPackages = [...packages];
              newPackages[index].totalPrice = v;
              setPackages(newPackages);
            }}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Einzelner Preis"
            isDisabled={!edit[index]}
            value={pkg.singlePrice ?? ""}
            onChange={(v) => {
              const newPackages = [...packages];
              newPackages[index].singlePrice = v;
              setPackages(newPackages);
            }}
          />
        </div>
      ))}
    </>
  );
}
