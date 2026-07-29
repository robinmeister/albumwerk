// Single help article. The body is developer- or admin-authored HTML and goes
// through the same sanitize-then-render pipeline as the legal pages; its
// typography is the `.help-article` block in index.css.

import { ReactElement, useMemo } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { ChevronRight, ExternalLink } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import DOMPurify from "dompurify";
import { Link, useNavigate, useParams } from "react-router-dom";

import EmptyState from "../../components/feedback/EmptyState";
import Page from "../../components/layout/Page";
import { articlesFor, getArticle, relatedArticles } from "../../content/help";
import { useHelpArticles } from "../../hooks/useHelpArticles";
import {
  adminMenuItems,
  adminNavItems,
  userMenuItems,
  userNavItems,
} from "../../utils/routes";

import { helpStyles as s } from "./helpStyles";

// "Zu Branding" beats "Zur passenden Seite" — the nav arrays already name every
// destination an article can point at.
const PATH_LABELS = new Map(
  [...adminNavItems, ...userNavItems, ...adminMenuItems, ...userMenuItems].map(
    (item) => [item.path, item.label],
  ),
);

type Props = {
  standalone?: boolean;
};

export default function HelpArticlePage({
  standalone = false,
}: Props): ReactElement {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { articles, audience } = useHelpArticles();

  // Resolve against the articles this viewer may read, so a customer following
  // a stale link to an admin article gets the not-found state, not the content.
  const article = useMemo(
    () => getArticle(slug, articlesFor(audience, articles)),
    [slug, audience, articles],
  );

  const html = useMemo(
    () => DOMPurify.sanitize(article?.bodyHtml ?? ""),
    [article?.bodyHtml],
  );
  const related = useMemo(
    () => (article ? relatedArticles(article, audience, articles) : []),
    [article, audience, articles],
  );

  const targetLabel = article?.relatedPath
    ? PATH_LABELS.get(article.relatedPath)
    : undefined;

  const header = (
    <>
      <nav aria-label="breadcrumb" {...stylex.props(s.breadcrumb)}>
        <Link to="/help" {...stylex.props(s.metaLink)}>
          <Text type="supporting" color="secondary">
            Hilfe
          </Text>
        </Link>
        <span {...stylex.props(s.chevron)}>
          <ChevronRight />
        </span>
        <Text type="supporting" color="disabled">
          {article?.title ?? "Nicht gefunden"}
        </Text>
      </nav>
      <h1 {...stylex.props(s.pageTitle, s.articleTitle)}>
        {article?.title ?? "Hilfe"}
      </h1>
    </>
  );

  const body = article ? (
    <div {...stylex.props(s.article)}>
      <div {...stylex.props(s.lead)}>
        <Text type="body" color="secondary">
          {article.summary}
        </Text>
      </div>

      {/* className must not be spread over by stylex.props — it would replace
          it and silently drop the whole typography */}
      <div className="rich-text help-article" dangerouslySetInnerHTML={{ __html: html }} />

      {article.relatedPath && (
        <div {...stylex.props(s.relatedPathCard)}>
          <Text type="body">
            {targetLabel
              ? `Einstellen kannst du das unter „${targetLabel}“.`
              : "Das stellst du direkt in der App ein."}
          </Text>
          <Button
            variant="primary"
            label={targetLabel ? `Zu ${targetLabel}` : "Zur passenden Seite"}
            onClick={() => navigate(article.relatedPath as string)}
          />
        </div>
      )}

      {article.links && article.links.length > 0 && (
        <div {...stylex.props(s.externalLinks)}>
          {article.links.map((link) => (
            <Button
              key={link.href}
              variant="secondary"
              icon={<ExternalLink />}
              label={link.label}
              onClick={() => window.open(link.href, "_blank", "noopener,noreferrer")}
            />
          ))}
        </div>
      )}

      <div {...stylex.props(s.footerBlocks)}>
        {related.length > 0 && (
          <div {...stylex.props(s.block)}>
            <Text type="label" weight="semibold">Das könnte auch helfen</Text>
            <div {...stylex.props(s.blockLinks)}>
              {related.map((other) => (
                <Link
                  key={other.slug}
                  to={`/help/${other.slug}`}
                  {...stylex.props(s.blockLink)}
                >
                  <Text type="body">{other.title}</Text>
                </Link>
              ))}
            </div>
          </div>
        )}

        {audience !== "public" && (
          <div {...stylex.props(s.block)}>
            <Text type="label" weight="semibold">Frage offen geblieben?</Text>
            <Text type="supporting" color="secondary">
              Beschreib kurz, was du vorhattest und was stattdessen passiert ist —
              damit lässt sich am schnellsten helfen.
            </Text>
            <Button
              variant="secondary"
              label="Anfrage stellen"
              onClick={() => navigate("/support?new=1")}
            />
          </div>
        )}
      </div>

      <div {...stylex.props(s.meta)}>
        <Link to="/help" {...stylex.props(s.metaLink)}>
          <Text type="supporting" color="secondary">
            Alle Hilfe-Themen
          </Text>
        </Link>
      </div>
    </div>
  ) : (
    <EmptyState
      title="Artikel nicht gefunden"
      description="Dieser Hilfe-Artikel existiert nicht (mehr). Vielleicht findest du ihn über die Übersicht."
      action={{ label: "Zur Hilfe-Übersicht", onClick: () => navigate("/help") }}
    />
  );

  // Breadcrumb and title live inside the centred column rather than in Page's
  // header, so they line up with the article text instead of the page gutter.
  if (standalone) {
    return (
      <div {...stylex.props(s.standalone)}>
        {header}
        {body}
      </div>
    );
  }

  return (
    <Page>
      <div {...stylex.props(s.inner)}>
        {header}
        {body}
      </div>
    </Page>
  );
}
