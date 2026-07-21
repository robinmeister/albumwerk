import { ReactElement, useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Search, PeopleOutline } from "@mui/icons-material";
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
      <CircularProgress size={20} />
    ) : (
      <Switch
        checked={user.isAdmin}
        onChange={() => void toggleAdmin(user)}
        color="primary"
      />
    );

  return (
    <Page>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Nutzerverwaltung
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {users.length} Nutzer · Änderung des Admin-Status meldet den Nutzer aus.
          </Typography>

          <TextField
            fullWidth
            placeholder="Suche nach Name oder E-Mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
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
            <Box>
              {filtered.map((user) => (
                <Card key={user.id} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ pb: "12px !important", pt: 1.5, px: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box flex={1} minWidth={0}>
                        <Typography variant="subtitle2" noWrap>
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {user.email}
                        </Typography>
                        <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          <Chip
                            label={user.verified ? "Verifiziert" : "Nicht verifiziert"}
                            size="small"
                            color={user.verified ? "success" : "default"}
                          />
                          <Chip
                            label={`${user.shootingIds.length} Shootings`}
                            size="small"
                            variant="outlined"
                          />
                          {user.isAdmin && (
                            <Chip label="Admin" size="small" color="primary" />
                          )}
                        </Box>
                      </Box>
                      <Box ml={1} flexShrink={0}>
                        {adminToggle(user)}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>E-Mail</TableCell>
                    <TableCell align="center">Shootings</TableCell>
                    <TableCell align="center">Verifiziert</TableCell>
                    <TableCell align="center">Admin</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell align="center">
                        <Chip label={user.shootingIds.length} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={user.verified ? "Ja" : "Nein"}
                          size="small"
                          color={user.verified ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="center">{adminToggle(user)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
