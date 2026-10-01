import { ReactElement, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ChevronRight, Search, Users as PeopleOutline } from "lucide-react";
import EmptyState from "../../components/feedback/EmptyState";
import { toast } from "react-toastify";
import { pb } from "../../config/pocketbase";
import Page from "../../components/layout/Page";
import useMobileService from "../../hooks/useMobileService";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  verified: boolean;
  shootingIds: string[];
  phone: string;
  street: string;
  zip: string;
  city: string;
  state: string;
  created: string;
};

type UserDetails = {
  albums: string[];
  orderCount: number;
  revenue: number;
};

function randomTokenKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 50 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const s = stylex.create({
  card: {
    padding: 24,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  search: { marginBlock: 16 },
  loading: { display: "flex", justifyContent: "center", padding: 32 },
  scroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  center: { textAlign: "center" },
  td: { padding: "8px 12px", borderBottom: "1px solid var(--color-border)" },
  tdCenter: { padding: "8px 12px", borderBottom: "1px solid var(--color-border)", textAlign: "center" },
  mobileList: { display: "flex", flexDirection: "column", gap: 8 },
  mobileCard: {
    padding: "12px 16px",
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  mobileInfo: { minWidth: 0, display: "flex", flexDirection: "column", gap: 4 },
  chips: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 },
  row: { cursor: "pointer", ":hover": { backgroundColor: "var(--color-background-muted)" } },
  mobileButton: { all: "unset", cursor: "pointer", display: "block" },
  dialog: { display: "flex", flexDirection: "column", gap: 16, padding: 8 },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 16,
    borderTop: "1px solid var(--color-border)",
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
});

const fullName = (u: UserRow) => `${u.firstName} ${u.lastName}`.trim() || "Ohne Namen";

export default function AdminUsersPage(): ReactElement {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const isMobile = useMobileService();

  useEffect(() => {
    void fetchUsers();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      users.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.firstName ?? "").toLowerCase().includes(q) ||
          (u.lastName ?? "").toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q)
      )
    );
  }, [search, users]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const records = await pb.collection("users").getFullList({
        sort: "email",
        // Schattenkonten der Kundenansicht-Vorschau gehoeren nicht in die
        // Nutzerverwaltung — sie leben Minuten und sind keine Kundschaft.
        filter: "isPreview != true",
        requestKey: null,
      });
      setUsers(
        records.map((r) => ({
          id: r.id,
          email: r.email ?? "",
          firstName: r.firstName ?? "",
          lastName: r.lastName ?? "",
          isAdmin: Boolean(r.isAdmin),
          verified: Boolean(r.verified),
          shootingIds: r.shootingIds ?? [],
          phone: r.phone ?? "",
          street: r.street ?? "",
          zip: r.zip ?? "",
          city: r.city ?? "",
          state: r.state ?? "",
          created: r.created ?? "",
        }))
      );
    } catch {
      toast.error("Fehler beim Laden der Nutzer");
    }
    setLoading(false);
  }

  function onAdminChanged(user: UserRow) {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    setSelected(user);
  }

  return (
    <Page>
      <div {...stylex.props(s.card)}>
        <Heading level={5}>Nutzerverwaltung</Heading>
        <Text type="body" color="secondary">
          {users.length} Nutzer · Tippe auf einen Eintrag für Details.
        </Text>

        <div {...stylex.props(s.search)}>
          <TextInput
            label="Suche"
            isLabelHidden
            width="100%"
            startIcon={<Search />}
            placeholder="Suche nach Name oder E-Mail…"
            value={search}
            onChange={(v) => setSearch(v)}
          />
        </div>

        {loading ? (
          <div {...stylex.props(s.loading)}>
            <Spinner size="md" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            dense
            icon={<PeopleOutline />}
            title={search ? "Keine Treffer" : "Noch keine Nutzer"}
            description={
              search
                ? "Zu deiner Suche gibt es keine passenden Nutzer."
                : "Sobald sich Kund:innen registrieren, erscheinen sie hier."
            }
          />
        ) : isMobile ? (
          <div {...stylex.props(s.mobileList)}>
            {filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelected(user)}
                {...stylex.props(s.mobileButton, s.mobileCard)}
              >
                <div {...stylex.props(s.mobileInfo)}>
                  <Text type="label" weight="semibold" maxLines={1}>
                    {fullName(user)}
                  </Text>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {user.email}
                  </Text>
                  <div {...stylex.props(s.chips)}>
                    <Badge
                      variant={user.verified ? "success" : "neutral"}
                      label={user.verified ? "Verifiziert" : "Nicht verifiziert"}
                    />
                    <Badge variant="neutral" label={`${user.shootingIds.length} Alben`} />
                    {user.isAdmin && <Badge variant="info" label="Admin" />}
                  </div>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : (
          <div {...stylex.props(s.scroll)}>
            <table {...stylex.props(s.table)}>
              <thead>
                <tr>
                  <th {...stylex.props(s.th)}>Name</th>
                  <th {...stylex.props(s.th)}>E-Mail</th>
                  <th {...stylex.props(s.th)}>Ort</th>
                  <th {...stylex.props(s.th, s.center)}>Alben</th>
                  <th {...stylex.props(s.th, s.center)}>Verifiziert</th>
                  <th {...stylex.props(s.th, s.center)}>Rolle</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    tabIndex={0}
                    onClick={() => setSelected(user)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(user)}
                    {...stylex.props(s.row)}
                  >
                    <td {...stylex.props(s.td)}>{fullName(user)}</td>
                    <td {...stylex.props(s.td)}>{user.email}</td>
                    <td {...stylex.props(s.td)}>
                      {[user.zip, user.city].filter(Boolean).join(" ") || "–"}
                    </td>
                    <td {...stylex.props(s.tdCenter)}>
                      <Badge variant="neutral" label={user.shootingIds.length} />
                    </td>
                    <td {...stylex.props(s.tdCenter)}>
                      <Badge
                        variant={user.verified ? "success" : "neutral"}
                        label={user.verified ? "Ja" : "Nein"}
                      />
                    </td>
                    <td {...stylex.props(s.tdCenter)}>
                      <Badge
                        variant={user.isAdmin ? "info" : "neutral"}
                        label={user.isAdmin ? "Admin" : "Kunde"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <UserDialog
          user={selected}
          onClose={() => setSelected(null)}
          onAdminChanged={onAdminChanged}
        />
      )}
    </Page>
  );
}

function UserDialog({
  user,
  onClose,
  onAdminChanged,
}: {
  user: UserRow;
  onClose: () => void;
  onAdminChanged: (user: UserRow) => void;
}): ReactElement {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const isSelf = user.id === pb.authStore.model?.id;

  useEffect(() => {
    let active = true;
    const albums = user.shootingIds.length
      ? pb.collection("shootings").getFullList({
          filter: user.shootingIds.map((id) => pb.filter("id = {:id}", { id })).join(" || "),
          fields: "title",
          requestKey: null,
        })
      : Promise.resolve([]);
    const orders = pb.collection("finishedOrders").getFullList({
      filter: pb.filter("userId = {:id}", { id: user.id }),
      fields: "totalPrice",
      requestKey: null,
    });
    Promise.all([albums, orders])
      .then(([a, o]) => {
        if (!active) return;
        setDetails({
          albums: a.map((r) => r.title as string),
          orderCount: o.length,
          revenue: o.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0),
        });
      })
      .catch(() => active && toast.error("Kundendetails konnten nicht geladen werden"));
    return () => {
      active = false;
    };
  }, [user.id, user.shootingIds]);

  async function toggleAdmin() {
    setSaving(true);
    try {
      await pb.collection("users").update(user.id, {
        isAdmin: !user.isAdmin,
        // Neuer tokenKey entwertet bestehende Sitzungen, damit die neue Rolle sofort greift.
        tokenKey: randomTokenKey(),
      });
      toast.success(`${user.email} ist jetzt ${!user.isAdmin ? "Admin" : "kein Admin mehr"}`);
      setConfirming(false);
      setConfirmText("");
      onAdminChanged({ ...user, isAdmin: !user.isAdmin });
    } catch (e: any) {
      toast.error(e?.response?.message || "Fehler beim Aktualisieren");
    }
    setSaving(false);
  }

  const address = [user.street, [user.zip, user.city].filter(Boolean).join(" "), user.state]
    .filter(Boolean)
    .join(", ");
  const promoteBlocked = !user.isAdmin && !user.verified;

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} width={520}>
      <div {...stylex.props(s.dialog)}>
        <div>
          <Heading level={5}>{fullName(user)}</Heading>
          <div {...stylex.props(s.chips)}>
            <Badge variant={user.isAdmin ? "info" : "neutral"} label={user.isAdmin ? "Admin" : "Kunde"} />
            <Badge
              variant={user.verified ? "success" : "neutral"}
              label={user.verified ? "E-Mail bestätigt" : "E-Mail nicht bestätigt"}
            />
          </div>
        </div>

        <MetadataList>
          <MetadataListItem label="E-Mail">
            <a href={`mailto:${user.email}`}>{user.email}</a>
          </MetadataListItem>
          <MetadataListItem label="Telefon">
            {user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : "–"}
          </MetadataListItem>
          <MetadataListItem label="Adresse">{address || "–"}</MetadataListItem>
          <MetadataListItem label="Kunde seit">
            {user.created ? new Date(user.created).toLocaleDateString("de-DE") : "–"}
          </MetadataListItem>
          <MetadataListItem label="Alben">
            {details
              ? details.albums.length
                ? details.albums.join(", ")
                : "Keine"
              : <Spinner size="sm" />}
          </MetadataListItem>
          <MetadataListItem label="Bestellungen">
            {details
              ? `${details.orderCount} · ${details.revenue.toFixed(2)}€ Umsatz`
              : <Spinner size="sm" />}
          </MetadataListItem>
        </MetadataList>

        <div {...stylex.props(s.section)}>
          <Text type="label" weight="semibold">Admin-Rechte</Text>
          {isSelf ? (
            <Text type="supporting" color="secondary">
              Deinen eigenen Admin-Status kannst du nicht ändern.
            </Text>
          ) : promoteBlocked ? (
            <Text type="supporting" color="secondary">
              Erst nach bestätigter E-Mail-Adresse kann dieses Konto Admin werden.
            </Text>
          ) : !confirming ? (
            <div {...stylex.props(s.actions)}>
              <Button
                variant={user.isAdmin ? "destructive" : "secondary"}
                label={user.isAdmin ? "Admin-Rechte entziehen" : "Zum Admin machen"}
                onClick={() => setConfirming(true)}
              />
            </div>
          ) : (
            <>
              <Text type="supporting" color="secondary">
                {user.isAdmin
                  ? "Das Konto verliert Zugriff auf alle Alben, Bestellungen und Einstellungen."
                  : "Admins sehen alle Kundendaten, Bestellungen und Zahlungen und können alles ändern."}{" "}
                Der Nutzer wird abgemeldet. Zur Bestätigung E-Mail-Adresse eingeben:
              </Text>
              <TextInput
                label="E-Mail zur Bestätigung"
                isLabelHidden
                width="100%"
                placeholder={user.email}
                value={confirmText}
                onChange={setConfirmText}
              />
              <div {...stylex.props(s.actions)}>
                <Button
                  variant="secondary"
                  label="Abbrechen"
                  onClick={() => {
                    setConfirming(false);
                    setConfirmText("");
                  }}
                />
                <Button
                  variant="destructive"
                  label={user.isAdmin ? "Rechte entziehen" : "Admin-Rechte vergeben"}
                  isDisabled={confirmText.trim().toLowerCase() !== user.email.toLowerCase()}
                  isLoading={saving}
                  onClick={() => void toggleAdmin()}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
