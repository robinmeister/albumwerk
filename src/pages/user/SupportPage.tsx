import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ArrowLeft, Headset, Plus } from "lucide-react";
import { ReactElement, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import EmptyState from "../../components/feedback/EmptyState";
import Page from "../../components/layout/Page";
import { useSettings } from "../../context/SettingsContext";
import { describeAppError, getAppError, readAppErrors } from "../../utils/errorReport";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  STATUS_LABELS,
  SupportContext,
  buildEnvironmentContext,
  buildSupportContext,
  createTicket,
  fetchMessages,
  fetchTickets,
  fetchVendorForwarding,
  formatDateTime,
  markTicketSeen,
  replyToTicket,
  setTicketStatus,
} from "../../utils/support";
import { SupportCategory, SupportMessage, SupportTicket } from "../../utils/types";

import { supportStyles as s, statusVariant } from "./supportStyles";

type View = "list" | "new" | "thread";

export default function SupportPage(): ReactElement {
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [vendorForwarding, setVendorForwarding] = useState(false);

  // thread
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // new ticket form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("other");
  const [body, setBody] = useState("");
  const [errorId, setErrorId] = useState("");
  const [consent, setConsent] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const errors = readAppErrors();
  const isTechnical = category === "technical";
  const forwardsToVendor = isTechnical && vendorForwarding;
  const attachedError = errorId ? getAppError(errorId) : null;
  const context: SupportContext | null = isTechnical
    ? attachedError
      ? buildSupportContext(attachedError)
      : buildEnvironmentContext()
    : null;

  const load = async () => {
    try {
      setTickets(await fetchTickets());
    } catch (error) {
      console.error("support: loading tickets failed", error);
      toast.error("Anfragen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void fetchVendorForwarding().then(setVendorForwarding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep links from the ErrorBoundary ("Problem melden") and from the
  // notification mails ("?ticket=…").
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const id = searchParams.get("error") ?? "";
      setView("new");
      if (id) {
        setErrorId(id);
        setCategory("technical");
        const entry = getAppError(id);
        if (entry) setSubject(`Fehler: ${entry.message.slice(0, 80)}`);
      }
      setSearchParams({}, { replace: true });
      return;
    }
    const ticketId = searchParams.get("ticket");
    if (ticketId && tickets.length) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) void openThread(ticket);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tickets]);

  const openThread = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    setView("thread");
    setReply("");
    if (ticket.unreadForUser) void markTicketSeen(ticket.id);
    try {
      setMessages(await fetchMessages(ticket.id));
    } catch (error) {
      console.error("support: loading messages failed", error);
      toast.error("Verlauf konnte nicht geladen werden");
    }
  };

  const resetForm = () => {
    setSubject("");
    setCategory("other");
    setBody("");
    setErrorId("");
    setConsent(false);
    setShowContext(false);
  };

  const canSubmit =
    subject.trim().length > 2 &&
    body.trim().length > 5 &&
    (!forwardsToVendor || consent);

  const submit = async () => {
    setSending(true);
    try {
      await createTicket({
        subject: subject.trim(),
        category,
        body: body.trim(),
        context,
        consentForward: forwardsToVendor && consent,
      });
      toast.success(
        forwardsToVendor
          ? "Anfrage gesendet und an den Hersteller weitergeleitet"
          : "Anfrage gesendet",
      );
      resetForm();
      setView("list");
      await load();
    } catch (error) {
      console.error("support: creating ticket failed", error);
      toast.error("Anfrage konnte nicht gesendet werden");
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!activeTicket || !reply.trim()) return;
    setSending(true);
    try {
      await replyToTicket(activeTicket.id, reply.trim());
      setReply("");
      setMessages(await fetchMessages(activeTicket.id));
      await load();
    } catch (error) {
      console.error("support: reply failed", error);
      toast.error("Nachricht konnte nicht gesendet werden");
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!activeTicket) return;
    try {
      await setTicketStatus(activeTicket.id, "resolved");
      toast.success("Anfrage als erledigt markiert");
      setView("list");
      await load();
    } catch (error) {
      console.error("support: closing ticket failed", error);
      toast.error("Status konnte nicht geändert werden");
    }
  };

  // --- new ticket ----------------------------------------------------------
  if (view === "new") {
    return (
      <Page title="Neue Anfrage">
        <div {...stylex.props(s.column)}>
          <div {...stylex.props(s.rowStart)}>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft />}
              label="Zurück"
              onClick={() => {
                resetForm();
                setView("list");
              }}
            />
          </div>

          <div {...stylex.props(s.card, s.cardPad)}>
            <Selector
              width="100%"
              label="Worum geht es?"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(value) => setCategory((value || "other") as SupportCategory)}
            />
            <TextInput
              width="100%"
              label="Betreff"
              value={subject}
              onChange={setSubject}
              placeholder="Kurze Zusammenfassung"
            />
            <TextArea
              width="100%"
              label="Beschreibung"
              rows={7}
              value={body}
              onChange={setBody}
              placeholder="Was ist passiert? Was hast du erwartet?"
            />

            {isTechnical && (
              <>
                {errors.length > 0 && (
                  <Selector
                    width="100%"
                    label="Aufgetretenen Fehler anhängen"
                    description="Hilft bei der Ursachensuche erheblich."
                    options={[
                      { value: "", label: "Keinen Fehler anhängen" },
                      ...errors.map((entry) => ({
                        value: entry.id,
                        label: describeAppError(entry),
                      })),
                    ]}
                    value={errorId}
                    onChange={(value) => setErrorId(value || "")}
                  />
                )}

                {forwardsToVendor ? (
                  <>
                    <Banner
                      status="info"
                      title="Diese Anfrage geht an den Hersteller der Software"
                      description="Technische Fehler kann der Betreiber dieser Seite nicht selbst beheben — deshalb wird die Meldung an den Hersteller weitergeleitet."
                    />
                    <button
                      type="button"
                      onClick={() => setShowContext((v) => !v)}
                      {...stylex.props(s.linkButton)}
                    >
                      {showContext
                        ? "Übertragene Daten ausblenden"
                        : "Übertragene Daten anzeigen"}
                    </button>
                    {showContext && (
                      <pre {...stylex.props(s.pre)}>
                        {JSON.stringify(
                          {
                            betreff: subject,
                            kategorie: CATEGORY_LABELS[category],
                            beschreibung: body,
                            technischerKontext: context,
                            deineEmail: consent ? "wird mitgesendet" : "wird nicht gesendet",
                          },
                          null,
                          2,
                        )}
                      </pre>
                    )}
                    <CheckboxInput
                      label="Ich bin einverstanden, dass diese Angaben inklusive meiner E-Mail-Adresse zur Fehleranalyse an den Hersteller der Software übermittelt werden."
                      value={consent}
                      onChange={(checked) => setConsent(checked === true)}
                    />
                  </>
                ) : (
                  <Text type="supporting" color="secondary">
                    Diese Anfrage geht an den Betreiber dieser Seite — eine
                    Weiterleitung an den Hersteller ist hier nicht eingerichtet.
                  </Text>
                )}
              </>
            )}

            <div {...stylex.props(s.rowEnd)}>
              <Button
                variant="primary"
                label="Anfrage senden"
                isDisabled={!canSubmit || sending}
                isLoading={sending}
                onClick={() => void submit()}
              />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  // --- thread --------------------------------------------------------------
  if (view === "thread" && activeTicket) {
    return (
      <Page title={activeTicket.subject}>
        <div {...stylex.props(s.column)}>
          <div {...stylex.props(s.rowStart)}>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft />}
              label="Alle Anfragen"
              onClick={() => {
                setView("list");
                void load();
              }}
            />
          </div>

          <div {...stylex.props(s.badgeRow)}>
            <Badge variant={statusVariant(activeTicket.status)} label={STATUS_LABELS[activeTicket.status]} />
            <Badge variant="neutral" label={CATEGORY_LABELS[activeTicket.category]} />
            {activeTicket.target === "vendor" && (
              <Badge variant="info" label="Beim Hersteller" />
            )}
          </div>

          <div {...stylex.props(s.column)}>
            {messages.map((message) => (
              <div
                key={message.id}
                {...stylex.props(
                  s.bubble,
                  message.authorRole === "user" ? s.bubbleOwn : s.bubbleOther,
                )}
              >
                <Text type="supporting" color="secondary">
                  {message.authorRole === "user"
                    ? "Du"
                    : message.authorRole === "admin"
                      ? settings.businessName
                      : "Hersteller"}
                  {" · "}
                  {formatDateTime(message.created)}
                </Text>
                <Text type="body">{message.body}</Text>
              </div>
            ))}
          </div>

          {activeTicket.status !== "closed" && (
            <div {...stylex.props(s.card, s.cardPad)}>
              <TextArea
                width="100%"
                label="Antwort"
                rows={4}
                value={reply}
                onChange={setReply}
                placeholder="Deine Nachricht"
              />
              <div {...stylex.props(s.rowBetween)}>
                <Button
                  variant="ghost"
                  label="Anliegen erledigt"
                  onClick={() => void closeTicket()}
                />
                <Button
                  variant="primary"
                  label="Senden"
                  isDisabled={!reply.trim() || sending}
                  isLoading={sending}
                  onClick={() => void sendReply()}
                />
              </div>
            </div>
          )}
        </div>
      </Page>
    );
  }

  // --- list ----------------------------------------------------------------
  return (
    <Page
      title="Support"
      actions={
        <Button
          variant="primary"
          icon={<Plus />}
          label="Neue Anfrage"
          onClick={() => setView("new")}
        />
      }
    >
      <div {...stylex.props(s.column)}>
        {loading ? (
          <div {...stylex.props(s.center)}>
            <Spinner />
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<Headset size={72} />}
            title="Noch keine Anfragen"
            description="Schreib uns bei Fragen zu deinen Bildern, deiner Bestellung — oder wenn etwas an der Seite nicht funktioniert."
            action={{ label: "Neue Anfrage", onClick: () => setView("new") }}
          />
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => void openThread(ticket)}
              {...stylex.props(s.card, s.ticketRow)}
            >
              <div {...stylex.props(s.ticketMain)}>
                <Heading level={6}>{ticket.subject}</Heading>
                <Text type="supporting" color="secondary">
                  {CATEGORY_LABELS[ticket.category]} · {formatDateTime(ticket.lastMessageAt || ticket.created)}
                </Text>
              </div>
              <div {...stylex.props(s.badgeRow)}>
                {ticket.unreadForUser && <Badge variant="info" label="Neue Antwort" />}
                <Badge variant={statusVariant(ticket.status)} label={STATUS_LABELS[ticket.status]} />
              </div>
            </button>
          ))
        )}

        <Text type="supporting" color="secondary">
          Du erreichst uns auch direkt per E-Mail
          {settings.contactEmail ? ": " : "."}
          {settings.contactEmail && (
            <Link href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</Link>
          )}
        </Text>
      </div>
    </Page>
  );
}
