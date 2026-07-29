// Help index: a search-first landing page with the articles grouped into
// category cards, filtered to what the current viewer may see. Renders in two
// shells — inside the app layout for signed-in users, standalone for visitors
// without an account.

import { ReactElement, useMemo, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ChevronRight, Search, SquarePen as Edit } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { Link, useNavigate } from "react-router-dom";

import BrandLogo from "../../components/widgets/BrandLogo";
import EmptyState from "../../components/feedback/EmptyState";
import Page from "../../components/layout/Page";
import { APP_VERSION } from "../../utils/errorReport";
import {
  HelpArticle,
  getCategory,
  groupByCategory,
  searchArticles,
} from "../../content/help";
import { useHelpArticles } from "../../hooks/useHelpArticles";
import { useSettings } from "../../context/SettingsContext";

import { helpStyles as s } from "./helpStyles";

type Props = {
  /** Logged-out visitors get a self-contained page instead of the app layout. */
  standalone?: boolean;
};

export default function HelpPage({ standalone = false }: Props): ReactElement {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { articles, audience } = useHelpArticles();
  const [search, setSearch] = useState("");

  const results = useMemo(
    () => searchArticles(search, audience, articles),
    [search, audience, articles],
  );
  const groups = useMemo(() => groupByCategory(results), [results]);
  const isSearching = search.trim().length > 0;

  const body = (
    <>
      <div {...stylex.props(s.hero)}>
        {standalone ? (
          <h2 {...stylex.props(s.pageTitle)}>Wie können wir helfen?</h2>
        ) : (
          <h1 {...stylex.props(s.pageTitle)}>Wie können wir helfen?</h1>
        )}
        <Text type="body" color="secondary">
          Durchsuche die Anleitungen oder stöbere in den Themen unten.
        </Text>
        <div {...stylex.props(s.heroSearch)}>
          <TextInput
            label="Hilfe durchsuchen"
            isLabelHidden
            width="100%"
            startIcon={<Search />}
            placeholder="Wonach suchst du?"
            value={search}
            onChange={(v) => setSearch(v)}
          />
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          dense
          title="Keine Treffer"
          description="Zu deiner Suche gibt es keinen passenden Artikel. Versuch es mit einem anderen Begriff — oder frag direkt nach."
          action={
            audience === "public"
              ? undefined
              : {
                  label: "Support kontaktieren",
                  onClick: () => navigate("/support?new=1"),
                }
          }
        />
      ) : isSearching ? (
        <div>
          <div {...stylex.props(s.resultCount)}>
            <Text type="supporting" color="secondary">
              {results.length} {results.length === 1 ? "Ergebnis" : "Ergebnisse"} für
              „{search.trim()}“
            </Text>
          </div>
          <div {...stylex.props(s.resultList)}>
            {results.map((article, index) => (
              <Link
                key={article.slug}
                to={`/help/${article.slug}`}
                {...stylex.props(s.resultRow, index > 0 && s.resultRowDivided)}
              >
                <div {...stylex.props(s.articleRowText)}>
                  <div {...stylex.props(s.resultCrumb)}>
                    <Text type="supporting" color="disabled">
                      {getCategory(article.category)?.label}
                    </Text>
                  </div>
                  <Text type="label" weight="semibold">
                    {article.title}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {article.summary}
                  </Text>
                </div>
                <span {...stylex.props(s.chevron)}>
                  <ChevronRight />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div {...stylex.props(s.sections)}>
          {groups.map(({ category, articles: grouped }) => (
            <section key={category.key} {...stylex.props(s.categoryCard)}>
              <div {...stylex.props(s.categoryHead)}>
                <span {...stylex.props(s.categoryIcon)}>
                  <category.Icon />
                </span>
                <div {...stylex.props(s.categoryText)}>
                  <h2 {...stylex.props(s.sectionTitle)}>{category.label}</h2>
                  <Text type="supporting" color="secondary">
                    {category.description}
                  </Text>
                </div>
              </div>
              <div {...stylex.props(s.articleList)}>
                {grouped.map((article) => (
                  <ArticleRow key={article.slug} article={article} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {audience !== "public" && (
        <div {...stylex.props(s.contactCard)}>
          <div {...stylex.props(s.contactText)}>
            <Text type="label" weight="semibold">
              Nicht fündig geworden?
            </Text>
            <Text type="supporting" color="secondary">
              {audience === "admin"
                ? "Schreib eine Support-Anfrage — technische Probleme leiten wir an den Hersteller weiter."
                : "Stell deine Frage direkt deinem Fotografen."}
            </Text>
          </div>
          <Button
            variant="primary"
            label="Anfrage stellen"
            onClick={() => navigate("/support?new=1")}
          />
        </div>
      )}

      <div {...stylex.props(s.meta)}>
        <Text type="supporting" color="disabled">
          Version {APP_VERSION}
          {settings.businessName ? ` · ${settings.businessName}` : ""}
        </Text>
        {settings.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} {...stylex.props(s.metaLink)}>
            <Text type="supporting" color="secondary">
              {settings.contactEmail}
            </Text>
          </a>
        )}
        <Link to="/imprint" {...stylex.props(s.metaLink)}>
          <Text type="supporting" color="secondary">
            Impressum
          </Text>
        </Link>
        <Link to="/privacy" {...stylex.props(s.metaLink)}>
          <Text type="supporting" color="secondary">
            Datenschutz
          </Text>
        </Link>
      </div>
    </>
  );

  if (standalone) {
    return (
      <div {...stylex.props(s.standalone)}>
        <div {...stylex.props(s.standaloneHead)}>
          <BrandLogo size={44} />
          <h1 {...stylex.props(s.pageTitle)}>
            {settings.businessName || "Hilfe"}
          </h1>
          <Link to="/login" {...stylex.props(s.inlineLink)}>
            <Text type="supporting">Zur Anmeldung</Text>
          </Link>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Page
      actions={
        audience === "admin" ? (
          <Button
            variant="secondary"
            icon={<Edit />}
            label="Eigene Artikel"
            onClick={() => navigate("/help/manage")}
          />
        ) : undefined
      }
    >
      <div {...stylex.props(s.inner)}>{body}</div>
    </Page>
  );
}

function ArticleRow({ article }: { article: HelpArticle }): ReactElement {
  return (
    <Link to={`/help/${article.slug}`} {...stylex.props(s.articleRow)}>
      <div {...stylex.props(s.articleRowText)}>
        <Text type="label" weight="semibold">
          {article.title}
        </Text>
        <Text type="supporting" color="secondary" maxLines={2}>
          {article.summary}
        </Text>
      </div>
      <span {...stylex.props(s.chevron)}>
        <ChevronRight />
      </span>
    </Link>
  );
}
