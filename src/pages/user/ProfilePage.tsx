import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { currentUser } from "../../config/currentUser";
import { getRecord, pb } from "../../config/pocketbase";
import {
  FormEvent,
  ReactElement,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import DeleteModal from "../../components/widgets/DeleteModal";
import { AuthContext } from "../../context/AuthContext";
import { User as UserType } from "../../utils/types";
import { AuthUser } from "../../config/authUser";

const s = stylex.create({
  card: {
    padding: 24,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  row2: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" },
    gap: 16,
  },
  actions: { display: "flex", gap: 12 },
  cancel: { flex: 1 },
  save: { flex: 2 },
  danger: { marginTop: 32, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
});

export default function ProfilePage(): ReactElement {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userData, setUserData] = useState<UserType>({
    uid: currentUser()?.uid ?? "",
    firstName: "",
    lastName: "",
    email: currentUser()?.email ?? "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    isAdmin: false,
  });

  useEffect(() => {
    void fetchUser();
  }, []);

  async function fetchUser(): Promise<void> {
    if (!user) return;
    try {
      const data = await getRecord("users", user.uid);
      if (data) {
        setUserData({
          uid: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          street: data.street,
          city: data.city,
          state: data.state,
          zip: data.zip,
          isAdmin: data.isAdmin,
        });
      }
    } catch (error) {
      console.error("Error getting document:", error);
    }
  }

  async function updateProfile(): Promise<void> {
    if (!user) return;
    try {
      await pb.collection("users").update(user.uid, userData);
      toast.success("Profil erfolgreich aktualisiert");
    } catch (e) {
      console.error("Error updating document: ", e);
      toast.error("Profil konnte nicht aktualisiert werden");
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void updateProfile();
  };

  const set = (patch: Partial<UserType>) =>
    setUserData((prev) => ({ ...prev, ...patch }));

  const deleteUserFromDB = async (user: AuthUser | null): Promise<void> => {
    if (!user) return;
    try {
      if (await getRecord("users", user.uid)) {
        await pb.collection("users").delete(user.uid);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteUser = async (): Promise<void> => {
    if (!user) return;
    try {
      void deleteUserFromDB(user);
      await user.delete();
      navigate("/login");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Page title="Profil">
      <div {...stylex.props(s.card)}>
        <form onSubmit={handleSubmit} {...stylex.props(s.form)}>
          <Heading level={6}>Kontaktinformationen</Heading>
          <TextInput
            width="100%"
            label="Vorname"
            value={userData.firstName ?? ""}
            onChange={(v) => set({ firstName: v })}
          />
          <TextInput
            width="100%"
            label="Nachname"
            value={userData.lastName ?? ""}
            onChange={(v) => set({ lastName: v })}
          />
          <TextInput
            width="100%"
            label="E-Mail-Adresse"
            isDisabled
            value={userData.email ?? ""}
            onChange={() => undefined}
          />
          <TextInput
            width="100%"
            label="Telefonnummer"
            value={userData.phone ?? ""}
            onChange={(v) => set({ phone: v })}
          />
          <Heading level={6}>Adressinformationen</Heading>
          <TextInput
            width="100%"
            label="Straße"
            value={userData.street ?? ""}
            onChange={(v) => set({ street: v })}
          />
          <div {...stylex.props(s.row2)}>
            <TextInput
              width="100%"
              label="Stadt"
              value={userData.city ?? ""}
              onChange={(v) => set({ city: v })}
            />
            <TextInput
              width="100%"
              label="Bundesland"
              value={userData.state ?? ""}
              onChange={(v) => set({ state: v })}
            />
          </div>
          <TextInput
            width="100%"
            label="Postleitzahl"
            value={userData.zip ?? ""}
            onChange={(v) => set({ zip: v })}
          />
          <div {...stylex.props(s.actions)}>
            <Button
              variant="secondary"
              size="lg"
              label="Abbrechen"
              xstyle={s.cancel}
              onClick={() => navigate(-1)}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label="Speichern"
              xstyle={s.save}
            />
          </div>
        </form>

        <div {...stylex.props(s.danger)}>
          <Divider />
          <Text type="supporting" color="secondary">
            Gefahrenzone
          </Text>
          <Button
            variant="ghost"
            size="sm"
            label="Profil löschen"
            onClick={() => setOpen(true)}
          />
        </div>
      </div>
      <DeleteModal
        name={"dein Profil"}
        open={open}
        setOpen={setOpen}
        onDelete={async () => deleteUser()}
      />
    </Page>
  );
}
