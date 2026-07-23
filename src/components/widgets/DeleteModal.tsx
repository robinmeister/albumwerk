import { ReactElement } from "react";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";

type Props = {
  name: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onDelete: () => void;
};

const s = stylex.create({
  body: { display: "flex", flexDirection: "column", gap: 16, padding: 8 },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});

export default function DeleteModal(props: Props): ReactElement {
  return (
    <Dialog
      isOpen={props.open}
      onOpenChange={(open) => props.setOpen(open)}
      width={440}
    >
      <div {...stylex.props(s.body)}>
        <Heading level={5}>Bist du dir sicher?</Heading>
        <Text type="body">Möchtest du wirklich {props.name} löschen?</Text>
        <div {...stylex.props(s.actions)}>
          <Button
            variant="secondary"
            label="Abbrechen"
            onClick={() => props.setOpen(false)}
          />
          <Button variant="destructive" label="Löschen" onClick={props.onDelete} />
        </div>
      </div>
    </Dialog>
  );
}
