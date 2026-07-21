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

interface SettingsContextValue {
  settings: AppSettings;
  // true once the server copy has been loaded (cache/defaults before that)
  loaded: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loaded, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
