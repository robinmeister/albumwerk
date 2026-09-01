import {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  AppSettings,
  DEFAULT_SETTINGS,
  fetchSettings,
  readSettingsCache,
  writeSettingsCache,
} from "../config/settings";
import {
  fetchVerkauf,
  VERKAUF_UNBEKANNT,
  type Verkaufsbereitschaft,
} from "../utils/verkauf";

interface SettingsContextValue {
  settings: AppSettings;
  // Abgeleitet aus settings + Katalog, siehe pb_hooks/lib/verkaufslib.js.
  // Hängt hier und nicht an einem eigenen Provider, weil refresh() nach jedem
  // Speichern ohnehin schon überall aufgerufen wird — die Checkliste
  // aktualisiert sich damit ohne zusätzliche Verdrahtung.
  verkauf: Verkaufsbereitschaft;
  // true once the server copy has been loaded (cache/defaults before that)
  loaded: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  verkauf: VERKAUF_UNBEKANNT,
  loaded: false,
  refresh: async () => undefined,
});

// Renders immediately with the cached copy (instant paint on revisits) or the
// neutral defaults, then refreshes from PocketBase in the background.
export function SettingsProvider({ children }: { children: ReactNode }): ReactElement {
  const [settings, setSettings] = useState<AppSettings>(
    () => readSettingsCache() ?? DEFAULT_SETTINGS,
  );
  const [loaded, setLoaded] = useState(false);
  const [verkauf, setVerkauf] = useState<Verkaufsbereitschaft>(VERKAUF_UNBEKANNT);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchSettings();
      setSettings(fresh);
      writeSettingsCache(fresh);
      setLoaded(true);
    } catch (error) {
      // offline or server down — keep cache/defaults
      console.warn("settings refresh failed", error);
    }
    // Getrennter Versuch: ein Fehlschlag hier darf die Einstellungen nicht
    // mitreißen, sie sind für jede Seite wichtiger als die Checkliste.
    try {
      setVerkauf(await fetchVerkauf());
    } catch (error) {
      console.warn("verkaufsbereitschaft refresh failed", error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, verkauf, loaded, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
