import { ReactElement } from "react";
import { Button, Modal } from "@mui/material";

import useMobileService from "../../hooks/useMobileService";
import { useTheme } from "@mui/material/styles";

type Props = {
  name: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onDelete: () => void;
};

export default function DeleteModal(props: Props): ReactElement {
  const theme = useTheme();
  const isMobile = useMobileService();
  let size: { height: string; width: string };
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  isMobile ? (size = { height: "27vh", width: "95vw" }) : (size = { height: "210px", width: "500px" });

  const body = (
    <div
      /* className={classes.paper} */
      style={{
        display: "inline-block",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: size.width,
        height: size.height,
        margin: "auto",
        backgroundColor: theme.palette.background.paper,
        border: "2px solid #000",
        boxShadow: theme.shadows[5],
        padding: theme.spacing(2, 4, 3),
      }}
    >
      <h2 id="simple-modal-title">Bist du dir sicher?</h2>
      <div style={{ margin: "20px" }}>
        Möchtest du wirklich {props.name} löschen?
      </div>
      <Button
        style={{ float: "left" }}
        color="primary"
        variant="contained"
        onClick={props.onDelete}
      >
        Löschen
      </Button>
      <Button
        style={{ float: "right" }}
        color="primary"
        variant="outlined"
        onClick={() => props.setOpen(false)}
      >
        Abbrechen
      </Button>
    </div>
  );

  return (
    <div>
      <Modal
        open={props.open}
        onClose={() => props.setOpen(false)}
        aria-labelledby="delete-modal"
        aria-describedby="modal-for-final-delete"
      >
        {body}
      </Modal>
    </div>
  );
}
