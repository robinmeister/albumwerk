// Single source the help views read from: the articles shipped with the build,
// merged with the operator's own articles from the helpArticles collection.
//
// The shipped set is returned synchronously so the help page paints instantly
// and stays useful even when the request fails — the base documentation must
// never depend on the network.

import { useContext, useEffect, useMemo, useState } from "react";

import { AuthContext } from "../context/AuthContext";
import { pb } from "../config/pocketbase";
import {
  HelpArticle,
  HelpAudience,
  audienceFor,
  helpArticles,
} from "../content/help";
import { fetchCustomArticles, mergeArticles } from "../utils/help";

function useHelpAudience(): HelpAudience {
  const { user } = useContext(AuthContext);
  const isAdmin = Boolean((pb.authStore.model as { isAdmin?: boolean } | null)?.isAdmin);
  return audienceFor(Boolean(user), isAdmin);
}

export function useHelpArticles(): {
  articles: HelpArticle[];
  audience: HelpAudience;
} {
  const audience = useHelpAudience();
  const [custom, setCustom] = useState<HelpArticle[]>([]);

  useEffect(() => {
    let active = true;
    void fetchCustomArticles()
      .then((records) => {
        if (active) setCustom(records);
      })
      // The collection may not exist yet on an instance that hasn't migrated,
      // and visitors may simply not be allowed to list it. Either way the
      // shipped articles below are still shown.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [audience]);

  const articles = useMemo(
    () => mergeArticles(helpArticles, custom),
    [custom],
  );

  return { articles, audience };
}
