import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ArrowLeft, Headset, Search, Send } from "lucide-react";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import EmptyState from "../../components/feedback/EmptyState";
import HelpHint from "../../components/widgets/HelpHint";
import Page from "../../components/layout/Page";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  fetchMessages,
  fetchTickets,
  fetchVendorForwarding,
  forwardTicket,
  formatDateTime,
  markTicketSeen,
  replyToTicket,
  setTicketStatus,
} from "../../utils/support";
import { SupportMessage, SupportStatus, SupportTicket } from "../../utils/types";
import { statusVariant, supportStyles as s } from "../user/supportStyles";

const STATUS_FILTERS = [
  { value: "active", label: "Offen & wartend" },
  { value: "all", label: "Alle" },
  { value: "open", label: "Offen" },
  { value: "resolved", label: "Erledigt" },
];

function reporterLabel(ticket: SupportTicket): string {
  const user = ticket.expand?.userId;
  if (!user) return "Unbekannt";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email;
}

export default function AdminSupportPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [vendorForwarding, setVendorForwarding] = useState(false);

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardNote, setForwardNote] = useState("");
  const [forwarding, setForwarding] = useState(false);

  const load = async () => {
    try {
      setTickets(await fetchTickets({ expandUser: true }));
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

  // Deep link from the notification mail
  useEffect(() => {
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
    setReply("");
    if (ticket.unreadForAdmin) void markTicketSeen(ticket.id);
    try {
      setMessages(await fetchMessages(ticket.id));
    } catch (error) {
      console.error("support: loading messages failed", error);
      toast.error("Verlauf konnte nicht geladen werden");
    }
  };

  const visibleTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter === "active" && (ticket.status === "resolved" || ticket.status === "closed")) {
        return false;
      }
      if (statusFilter === "open" && ticket.status !== "open") return false;
      if (statusFilter === "resolved" && ticket.status !== "resolved") return false;
      if (!term) return true;
      return (
        ticket.subject.toLowerCase().includes(term) ||
        reporterLabel(ticket).toLowerCase().includes(term)
      );
    });
  }, [tickets, search, statusFilter]);

  const sendReply = async () => {
    if (!activeTicket || !reply.trim()) return;
    setSending(true);
    try {
      await replyToTicket(activeTicket.id, reply.trim());
      setReply("");
      setMessages(await fetchMessages(activeTicket.id));
      await load();
      toast.success("Antwort gesendet");
    } catch (error) {
      console.error("support: reply failed", error);
      toast.error("Antwort konnte nicht gesendet werden");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: SupportStatus) => {
    if (!activeTicket) return;
    try {
      await setTicketStatus(activeTicket.id, status);
      setActiveTicket({ ...activeTicket, status });
      await load();
    } catch (error) {
      console.error("support: status change failed", error);
      toast.error("Status konnte nicht geändert werden");
    }
  };

  const doForward = async () => {
    if (!activeTicket) return;
    setForwarding(true);
    try {
      await forwardTicket(activeTicket.id, forwardNote.trim());
      toast.success("An den Hersteller weitergeleitet");
      setForwardOpen(false);
      setForwardNote("");
      const fresh = await fetchTickets({ expandUser: true });
      setTickets(fresh);
      setActiveTicket(fresh.find((t) => t.id === activeTicket.id) ?? activeTicket);
    } catch (error) {
      console.error("support: forward failed", error);
      toast.error("Weiterleitung fehlgeschlagen — Details im Server-Log");
    } finally {
      setForwarding(false);
    }
  };

  // --- thread --------------------------------------------------------------
  if (activeTicket) {
    const consentNote = activeTicket.consentForward
      ? "Der Melder hat der Weitergabe seiner Daten zugestimmt — E-Mail-Adresse und Name werden mitgesendet."
      : "Ohne Einwilligung des Melders: Name und E-Mail-Adresse werden NICHT mitgesendet.";

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
                setActiveTicket(null);
                void load();
              }}
            />
          </div>

          <div {...stylex.props(s.badgeRow)}>
            <Badge variant={statusVariant(activeTicket.status)} label={STATUS_LABELS[activeTicket.status]} />
            <Badge variant="neutral" label={CATEGORY_LABELS[activeTicket.category]} />
            <Badge variant="neutral" label={reporterLabel(activeTicket)} />
            {activeTicket.forwardState === "sent" && (
              <Badge
                variant="success"
                label={`An Hersteller gesendet · ${formatDateTime(activeTicket.forwardedAt)}`}
              />
            )}
            {activeTicket.forwardState === "failed" && (
              <Badge variant="error" label="Weiterleitung fehlgeschlagen" />
            )}
          </div>

          {activeTicket.forwardState === "failed" && activeTicket.forwardError && (
            <Banner
              status="error"
              title="Die Weiterleitung an den Hersteller ist fehlgeschlagen"
              description={activeTicket.forwardError}
            />
          )}

          {Boolean(activeTicket.context) && (
            <div {...stylex.props(s.card, s.cardPad)}>
              <Heading level={6}>Technischer Kontext</Heading>
              <pre {...stylex.props(s.pre)}>
                {JSON.stringify(activeTicket.context, null, 2)}
              </pre>
            </div>
          )}

          <div {...stylex.props(s.column)}>
            {messages.map((message) => (
              <div
                key={message.id}
                {...stylex.props(
                  s.bubble,
                  message.authorRole === "admin" ? s.bubbleOwn : s.bubbleOther,
                )}
              >
                <Text type="supporting" color="secondary">
                  {message.authorRole === "admin"
                    ? "Du"
                    : message.authorRole === "vendor"
                      ? "Hersteller"
                      : reporterLabel(activeTicket)}
                  {" · "}
                  {formatDateTime(message.created)}
                </Text>
                <Text type="body">{message.body}</Text>
              </div>
            ))}
          </div>

          <div {...stylex.props(s.card, s.cardPad)}>
            <TextArea
              width="100%"
              label="Antwort an den Kunden"
              rows={5}
              value={reply}
              onChange={setReply}
              placeholder="Deine Antwort — der Kunde bekommt sie per E-Mail"
            />
            <div {...stylex.props(s.rowBetween)}>
              <div {...stylex.props(s.badgeRow)}>
                <Button
                  variant="secondary"
                  label="An den Hersteller weiterleiten"
                  isDisabled={!vendorForwarding}
                  onClick={() => setForwardOpen(true)}
                />
                {activeTicket.status !== "resolved" ? (
                  <Button
                    variant="ghost"
                    label="Als erledigt markieren"
                    onClick={() => void changeStatus("resolved")}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    label="Wieder öffnen"
                    onClick={() => void changeStatus("open")}
                  />
                )}
              </div>
              <Button
                variant="primary"
                icon={<Send />}
                label="Antwort senden"
                isDisabled={!reply.trim() || sending}
                isLoading={sending}
                onClick={() => void sendReply()}
              />
            </div>
            {!vendorForwarding && (
              <Text type="supporting" color="secondary">
                Für diese Instanz ist keine Weiterleitung an den Hersteller
                eingerichtet (SAAS_CONTROL_URL / VENDOR_SUPPORT_EMAIL).
              </Text>
            )}
          </div>
        </div>

        <Dialog isOpen={forwardOpen} onOpenChange={setForwardOpen} width={560}>
          <div {...stylex.props(s.cardPad)}>
            <Heading level={5}>An den Hersteller weiterleiten</Heading>
            <Text type="body" color="secondary">{consentNote}</Text>
            <TextArea
              width="100%"
              label="Notiz für den Hersteller (optional)"
              rows={4}
              value={forwardNote}
              onChange={setForwardNote}
              placeholder="Was du selbst schon geprüft hast, Auffälligkeiten, Dringlichkeit …"
            />
            <pre {...stylex.props(s.pre)}>
              {JSON.stringify(
                {
                  betreff: activeTicket.subject,
                  kategorie: CATEGORY_LABELS[activeTicket.category],
                  melder: activeTicket.consentForward
                    ? reporterLabel(activeTicket)
                    : "(anonymisiert)",
                  technischerKontext: activeTicket.context ?? null,
                  nachrichten: messages.length,
                },
                null,
                2,
              )}
            </pre>
            <div {...stylex.props(s.rowBetween)}>
              <Button variant="ghost" label="Abbrechen" onClick={() => setForwardOpen(false)} />
              <Button
                variant="primary"
                label="Jetzt weiterleiten"
                isDisabled={forwarding}
                isLoading={forwarding}
                onClick={() => void doForward()}
              />
            </div>
          </div>
        </Dialog>
      </Page>
    );
  }

  // --- list ----------------------------------------------------------------
  return (
    <Page
      title="Support"
      actions={<HelpHint slug="support-postfach" />}
    >
      <div {...stylex.props(s.column)}>
        <div {...stylex.props(s.rowBetween)}>
          <TextInput
            label="Suche"
            isLabelHidden
            placeholder="Betreff oder Kunde"
            startIcon={<Search />}
            value={search}
            onChange={setSearch}
          />
          <Selector
            label="Status"
            isLabelHidden
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || "active")}
          />
        </div>

        {loading ? (
          <div {...stylex.props(s.center)}>
            <Spinner />
          </div>
        ) : visibleTickets.length === 0 ? (
          <EmptyState
            icon={<Headset size={72} />}
            title="Keine Anfragen"
            description="Hier landen die Support-Anfragen deiner Kundinnen und Kunden."
          />
        ) : (
          visibleTickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => void openThread(ticket)}
              {...stylex.props(s.card, s.ticketRow)}
            >
              <div {...stylex.props(s.ticketMain)}>
                <Heading level={6}>{ticket.subject}</Heading>
                <Text type="supporting" color="secondary">
                  {reporterLabel(ticket)} · {CATEGORY_LABELS[ticket.category]} ·{" "}
                  {formatDateTime(ticket.lastMessageAt || ticket.created)}
                </Text>
              </div>
              <div {...stylex.props(s.badgeRow)}>
                {ticket.unreadForAdmin && <Badge variant="info" label="Neu" />}
                {ticket.target === "vendor" && <Badge variant="purple" label="Hersteller" />}
                {ticket.forwardState === "failed" && (
                  <Badge variant="error" label="Weiterleitung fehlgeschlagen" />
                )}
                <Badge variant={statusVariant(ticket.status)} label={STATUS_LABELS[ticket.status]} />
              </div>
            </button>
          ))
        )}
      </div>
    </Page>
  );
}
