import { ReactElement } from "react";
import { Plus as Add, CircleX as Cancel, Pencil as Edit, Save } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading } from "@astryxdesign/core/Heading";
import * as stylex from "@stylexjs/stylex";

import { Price } from "../../../../utils/types";

type Props = {
  newPrice?: Price;
  setNewPrice: (newPrice: Price) => void;
  createNewPrice: boolean;
  setCreateNewPrice: (createNew: boolean) => void;
  editNewPrice: boolean;
  setEditNewPrice: (editNewPrice: boolean) => void;
  handleCreate: (price: Price) => Promise<void>;
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

export default function PriceCreate(props: Props): ReactElement {
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
    <div
      {...stylex.props(s.card)}
      onClick={() => {
        if (!createNewPrice) {
          setCreateNewPrice(true);
          setEditNewPrice(true);
          setNewPrice({ id: "", title: "", amount: "", description: "", isDownloadable: false });
        }
      }}
    >
      <div {...stylex.props(s.head)}>
        <Heading level={6}>Neuer Einzelpreis</Heading>
        {createNewPrice && (
          <div {...stylex.props(s.actions)}>
            {!editNewPrice ? (
              <IconButton variant="ghost" icon={<Edit />} label="Bearbeiten" onClick={() => setEditNewPrice(true)} />
            ) : (
              <>
                <IconButton variant="ghost" icon={<Save />} label="Speichern" onClick={() => handleCreate(newPrice as Price)} />
                <IconButton
                  variant="ghost"
                  icon={<Cancel />}
                  label="Abbrechen"
                  onClick={() => {
                    setEditNewPrice(false);
                    setCreateNewPrice(!createNewPrice);
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {createNewPrice ? (
        <>
          <TextInput
            width="100%"
            size="sm"
            label="Titel"
            isRequired
            value={newPrice?.title ?? ""}
            onChange={(v) => setNewPrice({ ...(newPrice as Price), title: v })}
          />
          <TextInput
            width="100%"
            size="sm"
           
            label="Preis"
            isRequired
            value={newPrice?.amount ?? ""}
            onChange={(v) => setNewPrice({ ...(newPrice as Price), amount: v })}
          />
          <TextArea
            width="100%"
            label="Beschreibung"
            isRequired
            value={newPrice?.description ?? ""}
            onChange={(v) => setNewPrice({ ...(newPrice as Price), description: v })}
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
