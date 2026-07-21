import { ReactElement, ReactNode, useState } from "react";
import { ErrorBoundary as Boundary } from "react-error-boundary";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  Collapse,
  Container,
  Link,
} from "@mui/material";

interface Props {
  children: ReactNode;
}

interface ErrorState {
  error: Error | null;
  componentStack: string;
}

export default function ErrorBoundary({ children }: Props): ReactElement {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    componentStack: "",
  });
  const [showDetails, setShowDetails] = useState(false);

  const handleError = (error: unknown, componentStack: string) => {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    setErrorState({ error: normalizedError, componentStack });
    console.error(normalizedError, componentStack);
  };

  return (
    <Boundary
      fallbackRender={(): ReactElement => (
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Card>
            <Alert severity="error">
              <AlertTitle>Es ist ein Fehler aufgetreten</AlertTitle>
              Beim Laden dieser Seite ist etwas schiefgelaufen. Bitte lade die
              Seite neu. Falls das Problem bestehen bleibt, kontaktiere uns bitte.
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Seite neu laden
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                >
                  Zur Startseite
                </Button>
              </Box>
              {errorState.error?.message && (
                <Box sx={{ mt: 2 }}>
                  <Link
                    component="button"
                    type="button"
                    variant="caption"
                    color="inherit"
                    underline="always"
                    onClick={() => setShowDetails((v) => !v)}
                  >
                    {showDetails ? "Technische Details ausblenden" : "Technische Details anzeigen"}
                  </Link>
                  <Collapse in={showDetails}>
                    <Box
                      component="pre"
                      sx={{
                        mt: 1,
                        p: 1,
                        fontSize: 12,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        bgcolor: "action.hover",
                        borderRadius: 1,
                      }}
                    >
                      {errorState.error.message}
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Alert>
          </Card>
        </Container>
      )}
      onError={(error, { componentStack }) =>
        handleError(error, componentStack ?? "")
      }
    >
      {children}
    </Boundary>
  );
}
