import { Box, CircularProgress } from "@mui/material";
import { ReactElement } from "react";

// Centered loading spinner used while a page or the app shell is loading.
// Replaces the absolutely-positioned CircularProgress that was copy-pasted
// across App, DownloadsPage, PublicDownloadsPage and ActionPage.
export default function PageLoader(): ReactElement {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ width: "100%", minHeight: "40vh", py: 8 }}
    >
      <CircularProgress />
    </Box>
  );
}
