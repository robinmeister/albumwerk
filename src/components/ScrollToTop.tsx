import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Reset scroll position on route change — otherwise navigating from a long
// album leaves the next page scrolled halfway down.
export default function ScrollToTop(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
