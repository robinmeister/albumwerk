/// <reference path="../pb_data/types.d.ts" />
//
// Double-Opt-In für den Self-Service-Signup.
//
// Neue Status vor dem bisherigen Ablauf:
//   pending  → Formular abgeschickt, Bestätigungsmail raus, NICHTS provisioniert
//   waitlist → Kapazitätsgrenze erreicht, Adresse notiert, keine Instanz
//
// Erst der Klick auf den Bestätigungslink schiebt den Datensatz auf
// "provisioning" und startet damit die alte Kette (siehe signup.pb.js).
// Das verhindert, dass ein Skript mit Wegwerf-Adressen echte Container
// erzeugt — unbestätigte Datensätze kosten nur eine Zeile in der Datenbank.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("customers");

  // Feld mit gleicher id ersetzt das bestehende
  collection.fields.add(new SelectField({
    id: "sel_cu_status",
    name: "status",
    required: true,
    maxSelect: 1,
    values: ["pending", "waitlist", "provisioning", "deploying", "trial",
      "active", "suspended", "error", "deleted"],
  }));

  // Bestätigungstoken: liegt nur in der Mail des Kunden und dient danach als
  // Ausweis der Warteseite (Statusabfrage + einmaliger Login-Token).
  collection.fields.add(new TextField({
    id: "txt_cu_ctoken", name: "confirmToken", hidden: true, max: 64,
  }));
  collection.fields.add(new DateField({ id: "date_cu_conf", name: "confirmedAt" }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("customers");
  collection.fields.add(new SelectField({
    id: "sel_cu_status",
    name: "status",
    required: true,
    maxSelect: 1,
    values: ["provisioning", "deploying", "trial", "active", "suspended",
      "error", "deleted"],
  }));
  collection.fields.removeById("txt_cu_ctoken");
  collection.fields.removeById("date_cu_conf");
  app.save(collection);
});
