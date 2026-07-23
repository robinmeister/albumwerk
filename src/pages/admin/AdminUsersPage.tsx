import { ReactElement, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Heading } from "@astryxdesign/core/Heading";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { Search, Users as PeopleOutline } from "lucide-react";
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
});

export default function AdminUsersPage(): ReactElement {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
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
          (u.lastName ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, users]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const records = await pb.collection("users").getFullList({
        sort: "email",
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
        }))
      );
    } catch {
      toast.error("Fehler beim Laden der Nutzer");
    }
    setLoading(false);
  }

  async function toggleAdmin(user: UserRow) {
    setToggling(user.id);
    try {
      await pb.collection("users").update(user.id, {
        isAdmin: !user.isAdmin,
        tokenKey: randomTokenKey(),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u))
      );
      toast.success(
        `${user.email} ist jetzt ${!user.isAdmin ? "Admin" : "kein Admin mehr"}`
      );
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
    setToggling(null);
  }

  const adminToggle = (user: UserRow) =>
    toggling === user.id ? (
      <Spinner size="sm" />
    ) : (
      <Switch
        label="Admin"
        isLabelHidden
        value={user.isAdmin}
        onChange={() => void toggleAdmin(user)}
      />
    );

  return (
    <Page>
      <div {...stylex.props(s.card)}>
        <Heading level={5}>Nutzerverwaltung</Heading>
        <Text type="body" color="secondary">
          {users.length} Nutzer · Änderung des Admin-Status meldet den Nutzer aus.
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
              <div key={user.id} {...stylex.props(s.mobileCard)}>
                <div {...stylex.props(s.mobileInfo)}>
                  <Text type="label" weight="semibold" maxLines={1}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {user.email}
                  </Text>
                  <div {...stylex.props(s.chips)}>
                    <Badge
                      variant={user.verified ? "success" : "neutral"}
                      label={user.verified ? "Verifiziert" : "Nicht verifiziert"}
                    />
                    <Badge variant="neutral" label={`${user.shootingIds.length} Shootings`} />
                    {user.isAdmin && <Badge variant="info" label="Admin" />}
                  </div>
                </div>
                {adminToggle(user)}
              </div>
            ))}
          </div>
        ) : (
          <div {...stylex.props(s.scroll)}>
            <table {...stylex.props(s.table)}>
              <thead>
                <tr>
                  <th {...stylex.props(s.th)}>Name</th>
                  <th {...stylex.props(s.th)}>E-Mail</th>
                  <th {...stylex.props(s.th, s.center)}>Shootings</th>
                  <th {...stylex.props(s.th, s.center)}>Verifiziert</th>
                  <th {...stylex.props(s.th, s.center)}>Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td {...stylex.props(s.td)}>
                      {user.firstName} {user.lastName}
                    </td>
                    <td {...stylex.props(s.td)}>{user.email}</td>
                    <td {...stylex.props(s.tdCenter)}>
                      <Badge variant="neutral" label={user.shootingIds.length} />
                    </td>
                    <td {...stylex.props(s.tdCenter)}>
                      <Badge
                        variant={user.verified ? "success" : "neutral"}
                        label={user.verified ? "Ja" : "Nein"}
                      />
                    </td>
                    <td {...stylex.props(s.tdCenter)}>{adminToggle(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}
