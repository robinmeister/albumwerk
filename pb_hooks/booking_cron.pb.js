/// <reference path="../pb_data/types.d.ts" />
//
// Stündliche Pflege der Terminbuchung (docs/terminbuchung.md §8, §10).
//
// Ein einziger Job für vier Aufgaben — sie laufen alle auf denselben
// Datensätzen und brauchen dieselbe Konfiguration:
//
//   1. Offene Anfragen verfallen lassen und die Zeit wieder freigeben.
//   2. Die Fotograf:in vorwarnen, bevor eine Anfrage verfällt.
//   3. Fällige Terminerinnerungen versenden.
//   4. Alte Buchungen anonymisieren.
//
// Der Job ist absichtlich fehlertolerant: Jeder Schritt fängt für sich ab, ein
// Problem beim Mailversand darf die Aufräumarbeiten nicht blockieren.

cronAdd("bookingMaintenance", "5 * * * *", () => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const mails = require(__hooks + "/lib/bookingmaillib.js");

  const app = $app;
  const config = booking.readConfig(app);
  if (!config.enabled) {
    return;
  }

  const now = Date.now();

  // --- 1. Verfallene Anfragen ---------------------------------------------
  // Eine offene Anfrage hält den Slot. Ohne diesen Schritt legen drei
  // Fake-Anfragen einen Samstag dauerhaft lahm.
  try {
    const expired = app.findRecordsByFilter(
      "appointments",
      'status = "pending" && expiresAt != "" && expiresAt < {:now}',
      "expiresAt",
      200,
      0,
      { now: booking.msToPbDate(now) }
    );
    for (let i = 0; i < expired.length; i++) {
      const record = expired[i];
      record.set("status", "expired");
      record.set("cancelledAt", booking.msToPbDate(now));
      record.set("cancelReason", "Anfrage ohne Antwort verfallen");
      try {
        app.save(record);
        // Die Kund:in hat „wir melden uns innerhalb von X Stunden" gelesen.
        // Sie ohne Nachricht hängen zu lassen wäre der schlechteste Ausgang.
        mails.customerDecision(app, record, config, {
          approved: false,
          note: "Leider konnten wir deine Anfrage nicht rechtzeitig beantworten. " +
                "Bitte wähle einen neuen Termin oder melde dich direkt bei uns.",
        });
      } catch (err) {
        app.logger().error("[booking] Verfall fehlgeschlagen", "id", record.id, "error", String(err));
      }
    }
    if (expired.length) {
      app.logger().info("[booking] Anfragen verfallen", "anzahl", expired.length);
    }
  } catch (err) {
    app.logger().error("[booking] Verfallslauf fehlgeschlagen", "error", String(err));
  }

  // --- 2. Vorwarnung ------------------------------------------------------
  // Genau ein Stundenfenster, damit die Warnung ohne zusätzliches Feld auf dem
  // Datensatz nur einmal rausgeht: Der Job läuft stündlich, und jede Anfrage
  // durchquert dieses Fenster genau einmal.
  try {
    const soon = app.findRecordsByFilter(
      "appointments",
      'status = "pending" && expiresAt >= {:from} && expiresAt < {:to}',
      "expiresAt",
      100,
      0,
      {
        from: booking.msToPbDate(now + 12 * booking.MS_PER_HOUR),
        to: booking.msToPbDate(now + 13 * booking.MS_PER_HOUR),
      }
    );
    if (soon.length) {
      mails.pendingExpiryWarning(app, soon, config);
    }
  } catch (err) {
    app.logger().error("[booking] Vorwarnung fehlgeschlagen", "error", String(err));
  }

  // --- 3. Terminerinnerungen ----------------------------------------------
  if (config.reminderHours > 0) {
    try {
      const due = app.findRecordsByFilter(
        "appointments",
        'status = "confirmed" && reminderSentAt = "" && start > {:now} && start <= {:until}',
        "start",
        200,
        0,
        {
          now: booking.msToPbDate(now),
          until: booking.msToPbDate(now + config.reminderHours * booking.MS_PER_HOUR),
        }
      );
      for (let i = 0; i < due.length; i++) {
        const record = due[i];
        // Erst vermerken, dann senden: Ein Neustart oder ein zweiter Durchlauf
        // würde sonst dieselbe Erinnerung erneut verschicken, und die Kund:in
        // bekommt fünf Mails. Lieber eine Erinnerung zu wenig als fünf zu viel.
        try {
          record.set("reminderSentAt", booking.msToPbDate(now));
          app.save(record);
        } catch (err) {
          app.logger().error("[booking] Erinnerungsvermerk fehlgeschlagen", "id", record.id, "error", String(err));
          continue;
        }
        mails.reminder(app, record, config);
      }
      if (due.length) {
        app.logger().info("[booking] Erinnerungen versendet", "anzahl", due.length);
      }
    } catch (err) {
      app.logger().error("[booking] Erinnerungslauf fehlgeschlagen", "error", String(err));
    }
  }

  // --- 4. Aufbewahrungsfrist ----------------------------------------------
  // Anonymisieren statt löschen: Die Löschpflicht ist erfüllt, aber Datum, Art
  // und Status bleiben — sonst zerschießt die Frist der Fotograf:in jede
  // Auswertung („wie viele Shootings hatte ich letztes Jahr?").
  try {
    const cutoff = new Date(now);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - config.retentionMonths);
    const old = app.findRecordsByFilter(
      "appointments",
      'start < {:cutoff} && anonymizedAt = "" && customerEmail != ""',
      "start",
      200,
      0,
      { cutoff: booking.msToPbDate(cutoff.getTime()) }
    );
    for (let i = 0; i < old.length; i++) {
      const record = old[i];
      record.set("customerName", "");
      record.set("customerEmail", "");
      record.set("customerPhone", "");
      record.set("message", "");
      record.set("cancelReason", "");
      // Der Storno-Link führt bei einem vergangenen Termin ohnehin ins Leere
      // und ist ein Zugangsmittel — er verschwindet mit.
      record.set("token", "");
      record.set("user", "");
      record.set("anonymizedAt", booking.msToPbDate(now));
      try {
        app.save(record);
      } catch (err) {
        app.logger().error("[booking] Anonymisieren fehlgeschlagen", "id", record.id, "error", String(err));
      }
    }
    if (old.length) {
      app.logger().info("[booking] Buchungen anonymisiert", "anzahl", old.length);
    }
  } catch (err) {
    app.logger().error("[booking] Aufbewahrungslauf fehlgeschlagen", "error", String(err));
  }
});
