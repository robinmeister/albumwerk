import { Spinner } from "@astryxdesign/core/Spinner";
import * as stylex from "@stylexjs/stylex";
import { ReactElement } from "react";

const s = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "40vh",
    padding: "64px 0",
  },
});

// Centered loading spinner used while a page or the app shell is loading.
// Replaces the absolutely-positioned CircularProgress that was copy-pasted
// across App, DownloadsPage, PublicDownloadsPage and ActionPage.
export default function PageLoader(): ReactElement {
  return (
    <div {...stylex.props(s.root)}>
      <Spinner size="lg" />
    </div>
  );
}
