// Importiere das Admin SDK
const admin = require('firebase-admin');

// Importiere deinen Service Account Key
// STELL SICHER, DASS DER DATEIPFAD KORREKT IST!
const serviceAccount = require('./kathis-platform-firebase-adminsdk-r80qr-973f962cc1.json');

// Initialisiere die Admin SDK-App
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Optional: Datenbank-URL angeben, wenn du auch RTDB nutzen würdest
  // databaseURL: "https://YOUR_DATABASE_NAME.firebaseio.com"
});

// Hole die Firestore-Instanz
const db = admin.firestore();

// Definiere die ID des Shootings, das du aktualisieren möchtest
const shootingId = 'P0Sc8pEjTjmmhCvJSmFi';

// Definiere die Daten, die du aktualisieren oder hinzufügen möchtest
// Beispiel: Das Feld 'verified' auf true setzen
const datenZuAktualisieren = {
  title: "Johanna",
  description: "",
  packageId: "",
  priceIds: [
    "CKrW7kScuFkgwFBSzLC3",
    "GETvpIqFKuDdPi7IDfcw",
    "QVfU2DMnOgpVk3Pws0PE",
    "aHcJdH3HpXsoRmjBcvBS",
    "hKaUj0bka5xgffntN0ip",
    "oyXQI8KovMMsbNhe51Bj"
  ],
  userIds: [ "GKPBdPylCWeXUMSIt7HFLiLfvty2", "9HcxEpWuHoM826UxiFjrCXMB1ty1"],
  withUserSelection: false,
  type: "sale",
  // Füge hier weitere Felder hinzu, die du ändern möchtest
  // name: 'Neuer Shooting Name'
};

async function updateDocument() {
  try {
    const shootingRef = db.collection('shootings').doc(shootingId);

    // Prüfe optional, ob das Dokument existiert, falls du update() nutzen willst
    const docSnapshot = await shootingRef.get();
    if (!docSnapshot.exists) {
      console.log(`Dokument mit ID ${shootingId} existiert nicht oder ist leer.`);
      // Wenn es nicht existiert, aber die ID laut deiner Erfahrung vergeben ist,
      // dann existiert es wahrscheinlich als leeres Dokument.
      // In diesem Fall ist set({ merge: true }) die sicherere Wahl.
      await shootingRef.set(datenZuAktualisieren, { merge: true });
      console.log(`Dokument ${shootingId} erstellt/aktualisiert mit set({ merge: true }).`);

    } else {
      console.log(`Dokument mit ID ${shootingId} gefunden. Aktualisiere...`);
      // Wenn es existiert (und Daten hat), kannst du update() nutzen,
      // oder auch set({ merge: true })
      await shootingRef.update(datenZuAktualisieren); // Oder set(datenZuAktualisieren, { merge: true })
      console.log(`Dokument ${shootingId} mit update() aktualisiert.`);
    }

    console.log("Update-Vorgang abgeschlossen.");

  } catch (error) {
    console.error("Fehler beim Ausführen des Skripts:", error);
  }
}

async function fetchDocument() {
  try {
    const shootingRef = db.collection('shootings').doc(shootingId);

    // Prüfe optional, ob das Dokument existiert, falls du update() nutzen willst
    const docSnapshot = await shootingRef.get();
    if (!docSnapshot.exists) {
      console.log(`Dokument mit ID ${shootingId} existiert nicht oder ist leer.`);
    } else {
      console.log(`Dokument mit ID ${shootingId} gefunden.`);
      console.log("Data: ", docSnapshot.data());
    }

    console.log("Update-Vorgang abgeschlossen.");

  } catch (error) {
    console.error("Fehler beim Ausführen des Skripts:", error);
  }
}

// Führe die Funktion aus
// updateDocument();
fetchDocument();
