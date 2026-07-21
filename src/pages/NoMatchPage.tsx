import { useNavigate } from "react-router-dom";
import { ReactElement } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Home } from "@mui/icons-material";

export default function NoMatchPage(): ReactElement {
  const navigate = useNavigate();
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={2}
      p={4}
    >
      <Typography variant="h1" color="text.secondary" fontWeight="bold">
        404
      </Typography>
      <Typography variant="h5" color="text.secondary">
        Diese Seite existiert nicht.
      </Typography>
      <Button
        variant="contained"
        startIcon={<Home />}
        onClick={() => navigate("/")}
        sx={{ mt: 2 }}
      >
        Zur Startseite
      </Button>
    </Box>
  );
}
