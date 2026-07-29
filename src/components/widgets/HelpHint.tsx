// Contextual help: a small (?) next to a setting or section that explains it in
// one or two sentences and links to the full article.
//
// The text comes from the article registry, so a section and its help article
// can never drift apart — there is exactly one place the wording lives.

import { ReactElement } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Popover } from "@astryxdesign/core/Popover";
import { Text } from "@astryxdesign/core/Text";
import { CircleHelp } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { Link } from "react-router-dom";

import { getArticle } from "../../content/help";

type Props = {
  /** Slug of the article this explains. */
  slug: string;
  /** Overrides the article summary when the context needs different wording. */
  text?: string;
};

const s = stylex.create({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxWidth: 280,
    padding: 4,
  },
  link: { color: "var(--color-text-accent)", textDecoration: "underline" },
  trigger: { display: "inline-flex", verticalAlign: "middle" },
});

export default function HelpHint({ slug, text }: Props): ReactElement | null {
  const article = getArticle(slug);

  // A hint pointing at a renamed or deleted article would be a dead end, so it
  // renders nothing rather than an empty popover. Loud in dev, silent in prod.
  if (!article) {
    if (import.meta.env.DEV) {
      console.warn(`[help] HelpHint verweist auf unbekannten Artikel "${slug}"`);
    }
    return null;
  }

  const body = text ?? article.summary;

  return (
    <span {...stylex.props(s.trigger)}>
      <Popover
        label={`Hilfe zu „${article.title}“`}
        width={300}
        content={
          <div {...stylex.props(s.content)}>
            <Text type="label" weight="semibold">
              {article.title}
            </Text>
            <Text type="supporting" color="secondary">
              {body}
            </Text>
            <Link to={`/help/${article.slug}`} {...stylex.props(s.link)}>
              <Text type="supporting">Mehr erfahren</Text>
            </Link>
          </div>
        }
      >
        <IconButton
          variant="ghost"
          size="sm"
          icon={<CircleHelp />}
          label={`Hilfe zu ${article.title}`}
        />
      </Popover>
    </span>
  );
}
