// Onboarding hint for pages that are reachable but not yet configured — where
// there is no empty state to hang a help link on (payments without a provider,
// legal pages without text).
//
// Dismissals are per browser, not per account: this is a nudge, not a setting,
// and it is not worth a round trip or a schema field.

import { ReactElement, ReactNode, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useNavigate } from "react-router-dom";

import { getArticle } from "../../content/help";

const STORAGE_KEY = "help_banner_dismissed_v1";

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    // private mode / corrupted value — showing the banner again is harmless
    return [];
  }
}

function persistDismissed(slug: string): void {
  try {
    const next = Array.from(new Set([...readDismissed(), slug]));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // nothing to do; the banner just reappears next time
  }
}

type Props = {
  /** Help article this points at. Also the dismissal key. */
  slug: string;
  title: string;
  /** Shown in the header under the title. Falls back to the article summary. */
  description?: ReactNode;
  /** Hide it without unmounting the caller's surrounding markup. */
  isHidden?: boolean;
  status?: "info" | "warning";
};

export default function HelpBanner({
  slug,
  title,
  description,
  isHidden = false,
  status = "info",
}: Props): ReactElement | null {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => readDismissed().includes(slug));

  const article = getArticle(slug);

  if (isHidden || dismissed || !article) return null;

  // Everything goes in the header: Banner tucks `children` behind a
  // collapse toggle, which is the wrong place for the one action that
  // matters here.
  return (
    <Banner
      status={status}
      title={title}
      description={description ?? article.summary}
      isDismissable
      onDismiss={() => {
        persistDismissed(slug);
        setDismissed(true);
      }}
      endContent={
        <Button
          variant="secondary"
          size="sm"
          label="Anleitung öffnen"
          onClick={() => navigate(`/help/${article.slug}`)}
        />
      }
    />
  );
}
