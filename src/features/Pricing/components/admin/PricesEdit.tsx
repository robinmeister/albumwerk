import { ReactElement } from "react";
import { CircleX as Cancel, Trash2 as Delete, Pencil as Edit, Save } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading } from "@astryxdesign/core/Heading";
import * as stylex from "@stylexjs/stylex";

import { Price } from "../../../../utils/types";

type Props = {
  prices: Price[];
  setPrices: (prices: Price[]) => void;
  activePrice: Price | undefined;
  setActivePrice: (tier: Price) => void;
  handleUpdate: (tier: Price, index: number) => Promise<void>;
  handleDelete: (tier: Price) => Promise<void>;
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

export default function PriceEdit(props: Props): ReactElement {
  const {
    prices,
    setPrices,
    setActivePrice,
    handleUpdate,
    handleEdit,
    edit,
    handleCancel,
    setOpenDeleteModal,
  } = props;
  return (
    <>
      {prices.map((tier: Price, index) => (
        <div key={tier.id} {...stylex.props(s.card)}>
          <div {...stylex.props(s.head)}>
            <Heading level={6}>Preis {index + 1}</Heading>
            <div {...stylex.props(s.actions)}>
              {!edit[index] && (
                <IconButton variant="ghost" icon={<Edit />} label="Bearbeiten" onClick={() => handleEdit(index, "price")} />
              )}
              {edit[index] && (
                <>
                  <IconButton variant="ghost" icon={<Save />} label="Speichern" onClick={() => handleUpdate(tier, index)} />
                  <IconButton variant="ghost" icon={<Cancel />} label="Abbrechen" onClick={() => handleCancel(index, "price")} />
                </>
              )}
              <IconButton
                variant="ghost"
                icon={<Delete />}
                label="Löschen"
                onClick={() => {
                  setActivePrice(tier);
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
            value={tier?.title ?? ""}
            onChange={(v) => {
              const newPrice = [...prices];
              newPrice[index].title = v;
              setPrices(newPrice);
            }}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Preis"
            isRequired
            isDisabled={!edit[index]}
            value={tier.amount ?? ""}
            onChange={(v) => {
              const newPrice = [...prices];
              newPrice[index].amount = v;
              setPrices(newPrice);
            }}
          />
          <TextArea
            width="100%"
            label="Beschreibung"
            isRequired
            isDisabled={!edit[index]}
            value={tier.description ?? ""}
            onChange={(v) => {
              const newPrice = [...prices];
              newPrice[index].description = v;
              setPrices(newPrice);
            }}
          />
        </div>
      ))}
    </>
  );
}
