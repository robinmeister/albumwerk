import { ReactElement, ReactNode, useState } from "react";
import { ErrorBoundary as Boundary } from "react-error-boundary";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";

interface Props {
  children: ReactNode;
}

interface ErrorState {
  error: Error | null;
  componentStack: string;
}

const s = stylex.create({
  container: { maxWidth: 560, margin: "48px auto", padding: "0 16px" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 },
  detailsToggle: {
    marginTop: 16,
    background: "none",
    border: "none",
    padding: 0,
    color: "var(--color-text-secondary)",
    textDecoration: "underline",
    cursor: "pointer",
    font: "inherit",
  },
  pre: {
    marginTop: 8,
    padding: 8,
    fontSize: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    backgroundColor: "var(--color-background-muted)",
    borderRadius: "var(--radius-element)",
  },
});

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
        <div {...stylex.props(s.container)}>
          <Banner status="error" title="Es ist ein Fehler aufgetreten">
            <Text type="body">
              Beim Laden dieser Seite ist etwas schiefgelaufen. Bitte lade die
              Seite neu. Falls das Problem bestehen bleibt, kontaktiere uns bitte.
            </Text>
            <div {...stylex.props(s.actions)}>
              <Button
                size="sm"
                variant="secondary"
                label="Seite neu laden"
                onClick={() => window.location.reload()}
              />
              <Button
                size="sm"
                variant="secondary"
                label="Zur Startseite"
                onClick={() => {
                  window.location.href = "/";
                }}
              />
            </div>
            {errorState.error?.message && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  {...stylex.props(s.detailsToggle)}
                >
                  {showDetails
                    ? "Technische Details ausblenden"
                    : "Technische Details anzeigen"}
                </button>
                {showDetails && (
                  <pre {...stylex.props(s.pre)}>{errorState.error.message}</pre>
                )}
              </div>
            )}
          </Banner>
        </div>
      )}
      onError={(error, { componentStack }) =>
        handleError(error, componentStack ?? "")
      }
    >
      {children}
    </Boundary>
  );
}
