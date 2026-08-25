import { useEffect, useState } from "react";

// Ein einziger Media-Query statt eines resize-Listeners: der Browser meldet
// sich nur, wenn die Schwelle tatsächlich überschritten wird — nicht bei jedem
// Pixel, das die Fensterbreite sich ändert.
const QUERY = "(max-width: 768px)";

const useMobileService = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
};

export default useMobileService;
