import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { currentUser } from "../../config/currentUser";
import {
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  updateDoc,
} from "../../config/firestore-compat";
import {
  ChangeEvent,
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
    const userRef = doc("users", user.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data: DocumentData = docSnap.data();
        setUserData({
          uid: docSnap.id,
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
      await updateDoc(doc("users", user.uid), userData);
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

  const handleDataChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const deleteUserFromDB = async (user: AuthUser | null): Promise<void> => {
    if (!user) return;
    try {
      const docRef = doc("users", user.uid);
      const result = await getDoc(docRef);
      if (result.exists()) {
        await deleteDoc(docRef);
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
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box fontWeight="fontWeightBold" fontSize={18} mb={1}>
                  Kontaktinformationen
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Vorname"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nachname"
                  name="lastName"
                  value={userData.lastName}
                  onChange={handleDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="E-Mail-Adresse"
                  name="email"
                  disabled
                  value={userData.email}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Telefonnummer"
                  name="phone"
                  value={userData.phone}
                  onChange={handleDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box fontWeight="fontWeightBold" fontSize={18} mb={1} mt={1}>
                  Adressinformationen
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Straße"
                  name="street"
                  value={userData.street}
                  onChange={handleDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Stadt"
                  name="city"
                  value={userData.city}
                  onChange={handleDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Bundesland"
                  name="state"
                  value={userData.state}
                  onChange={handleDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Postleitzahl"
                  name="zip"
                  value={userData.zip}
                  onChange={handleDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  size="large"
                  onClick={() => navigate(-1)}
                >
                  Abbrechen
                </Button>
              </Grid>
              <Grid item xs={8}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  Speichern
                </Button>
              </Grid>
            </Grid>
          </form>

          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Gefahrenzone
            </Typography>
            <Button
              variant="text"
              color="error"
              size="small"
              onClick={() => setOpen(true)}
            >
              Profil löschen
            </Button>
          </Box>
        </CardContent>
      </Card>
      <DeleteModal
        name={"dein Profil"}
        open={open}
        setOpen={setOpen}
        onDelete={async () => deleteUser()}
      />
    </Page>
  );
}
