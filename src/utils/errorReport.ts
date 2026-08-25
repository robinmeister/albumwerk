// Ring buffer of the last few errors caught by src/components/layout/ErrorBoundary.tsx,
// so a user can attach the actual crash to a support ticket instead of
// describing it from memory ("irgendwas mit einem weißen Bildschirm").
//
// sessionStorage, not localStorage: the context is only useful for the session
// it happened in, and it must not linger on a shared device.

declare const __APP_VERSION__: string;

export const APP_VERSION =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";

const STORAGE_KEY = "app_error_log_v1";
const MAX_ENTRIES = 5;
const MAX_STACK = 4000;
const MAX_COMPONENT_STACK = 2000;

export interface AppErrorEntry {
  id: string;
  at: string;
  message: string;
  stack: string;
  componentStack: string;
  route: string;
  userAgent: string;
  viewport: string;
  appVersion: string;
}

function readRaw(): AppErrorEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppErrorEntry[]) : [];
  } catch {
    return [];
  }
}

// Newest first.
export function readAppErrors(): AppErrorEntry[] {
  return readRaw();
}

export function getAppError(id: string): AppErrorEntry | null {
  return readRaw().find((entry) => entry.id === id) ?? null;
}

// Records an error and returns its id, which the ErrorBoundary passes to the
// support form via ?error=<id>.
export function recordAppError(error: Error, componentStack: string): string {
  const id = `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: AppErrorEntry = {
    id,
    at: new Date().toISOString(),
    message: String(error.message || error).slice(0, 500),
    stack: String(error.stack || "").slice(0, MAX_STACK),
    componentStack: String(componentStack || "").slice(0, MAX_COMPONENT_STACK),
    route: `${window.location.pathname}${window.location.search}`,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    appVersion: APP_VERSION,
  };

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([entry, ...readRaw()].slice(0, MAX_ENTRIES)),
    );
  } catch {
    // storage full/unavailable — the id still works for this render, the
    // support form just won't find the details
  }
  return id;
}

// Short human label for the picker in the support form.
export function describeAppError(entry: AppErrorEntry): string {
  const time = new Date(entry.at).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} · ${entry.route} · ${entry.message.slice(0, 60)}`;
}
