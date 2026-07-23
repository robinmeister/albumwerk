import { useNavigate } from "react-router-dom";
import { ReactElement } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { House as Home } from "lucide-react";

const s = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 16,
    padding: 32,
    textAlign: "center",
  },
});

export default function NoMatchPage(): ReactElement {
  const navigate = useNavigate();
  return (
    <div {...stylex.props(s.root)}>
      <Heading level={1} type="display-1" color="secondary">
        404
      </Heading>
      <Heading level={2} type="display-3" color="secondary">
        Diese Seite existiert nicht.
      </Heading>
      <Button
        variant="primary"
        icon={<Home />}
        label="Zur Startseite"
        onClick={() => navigate("/")}
      />
    </div>
  );
}
