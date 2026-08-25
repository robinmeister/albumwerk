/// <reference path="../pb_data/types.d.ts" />
// Appointment booking (docs/terminbuchung.md).
//
// Four collections plus settings fields. The load-bearing decisions:
//
// - Slots are NEVER stored. Availability is computed from rules minus
//   exceptions minus bookings on every request; an appointment stores real
//   start/end timestamps and therefore survives any later rule change.
// - Exceptions are time ranges with a sign (`kind`), not references to a rule
//   occurrence — a blocked hour stays blocked when the rule around it moves.
//   The same record type carries holidays, ad-hoc blocks and extra openings.
// - `appointments.createRule` is null: bookings only ever enter through
//   /api/custom/booking, which validates and writes inside one transaction.
//   Same reasoning as 1784600003_lock_customer_order_create.js — the client
//   asserts something valuable, the server decides.
// - Rules and exceptions are admin-only readable. Publishing them would expose
//   the photographer's whole calendar (holidays, how busy they are) to anyone
//   who can reach the embed. Only the *result* (free start times) goes public.
// - Appointment types ARE publicly readable while active: name, duration and
//   price are shown in the booking form anyway.
//
// Durations are minutes-since-midnight / minute counts (plain integers), never
// wall-clock strings — the timezone is applied once, in the availability
// calculator (pb_hooks/lib/availabilitylib.js).

const SETTINGS_ID = "appsettings0001";

migrate((app) => {
  // --- appointment types -------------------------------------------------
  const types = new Collection({
    id: "apptypes0000001",
    name: "appointmentTypes",
    type: "base",
    system: false,
    // active types are public: the embed renders them without any auth
    listRule: "@request.auth.isAdmin = true || active = true",
    viewRule: "@request.auth.isAdmin = true || active = true",
    createRule: "@request.auth.isAdmin = true",
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: "@request.auth.isAdmin = true",
    indexes: [
      "CREATE UNIQUE INDEX idx_at_slug ON appointmentTypes (slug)",
      "CREATE INDEX idx_at_sort ON appointmentTypes (active, sort)",
    ],
    fields: [
      { name: "name", id: "txt_at_name", type: "text", max: 80, min: 1, pattern: "", required: true, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      // preselects the type in the embed (?type=<slug>) so a photographer can
      // put "book a portrait shoot" on the portrait page of their own site
      { name: "slug", id: "txt_at_slug", type: "text", max: 60, min: 1, pattern: "^[a-z0-9-]+$", required: true, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "description", id: "txt_at_desc", type: "text", max: 500, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // where it happens — free text, shown in the form and the confirmation mail
      { name: "location", id: "txt_at_loc", type: "text", max: 200, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "durationMin", id: "num_at_dur", type: "number", min: 5, max: 1440, onlyInt: true, required: true, hidden: false, presentable: false, system: false },
      // trailing buffer only. A leading *and* trailing buffer doubles the gap
      // between two appointments and is the usual reason people stop
      // understanding their own configuration.
      { name: "bufferMin", id: "num_at_buf", type: "number", min: 0, max: 480, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      // distance between two possible start times; empty falls back to
      // durationMin + bufferMin (see availabilitylib.startIntervalOf)
      { name: "startIntervalMin", id: "num_at_int", type: "number", min: 5, max: 1440, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      // minimum notice, per type: a 20 minute intro call may be more
      // spontaneous than a studio shoot
      { name: "leadTimeMin", id: "num_at_lead", type: "number", min: 0, max: 525600, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      { name: "requiresApproval", id: "bool_at_appr", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "phoneMode", id: "sel_at_phone", type: "select", maxSelect: 1, values: ["off", "optional", "required"], required: false, hidden: false, presentable: false, system: false },
      // displayed only — booking never takes money (docs/terminbuchung.md §12).
      // Currency comes from settings.currency.
      { name: "price", id: "num_at_price", type: "number", min: 0, max: null, onlyInt: false, required: false, hidden: false, presentable: false, system: false },
      { name: "active", id: "bool_at_active", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "sort", id: "num_at_sort", type: "number", min: null, max: null, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      { name: "created", id: "autodate_at_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_at_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(types);

  // --- weekly availability rules ----------------------------------------
  const rules = new Collection({
    id: "availrules00001",
    name: "availabilityRules",
    type: "base",
    system: false,
    // NOT public: the weekly pattern says when the photographer works
    listRule: "@request.auth.isAdmin = true",
    viewRule: "@request.auth.isAdmin = true",
    createRule: "@request.auth.isAdmin = true",
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: "@request.auth.isAdmin = true",
    indexes: [
      "CREATE INDEX idx_ar_weekday ON availabilityRules (active, weekday)",
    ],
    fields: [
      // ISO weekday: 1 = Monday … 7 = Sunday. Deliberately not 0-based —
      // 0=Sunday vs 0=Monday is a classic off-by-one across JS and Go.
      { name: "weekday", id: "num_ar_wday", type: "number", min: 1, max: 7, onlyInt: true, required: true, hidden: false, presentable: false, system: false },
      // minutes since local midnight (wall clock in settings.timezone)
      { name: "startMinute", id: "num_ar_start", type: "number", min: 0, max: 1439, onlyInt: true, required: true, hidden: false, presentable: false, system: false },
      // may exceed 1440 for windows running past midnight (e.g. 22:00–01:00)
      { name: "endMinute", id: "num_ar_end", type: "number", min: 1, max: 2880, onlyInt: true, required: true, hidden: false, presentable: false, system: false },
      // empty = every type may be booked in this window
      { name: "allowedTypes", id: "rel_ar_types", type: "relation", collectionId: "apptypes0000001", cascadeDelete: false, minSelect: 0, maxSelect: 50, required: false, hidden: false, presentable: false, system: false },
      { name: "active", id: "bool_ar_active", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "created", id: "autodate_ar_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_ar_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(rules);

  // --- exceptions (blocks and extra openings) ----------------------------
  const exceptions = new Collection({
    id: "availexcept0001",
    name: "availabilityExceptions",
    type: "base",
    system: false,
    listRule: "@request.auth.isAdmin = true",
    viewRule: "@request.auth.isAdmin = true",
    createRule: "@request.auth.isAdmin = true",
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: "@request.auth.isAdmin = true",
    indexes: [
      "CREATE INDEX idx_ae_range ON availabilityExceptions (start, end)",
      // the calendar import replaces everything it previously wrote for a feed
      "CREATE INDEX idx_ae_source ON availabilityExceptions (source, feedRef)",
    ],
    fields: [
      // block = time is unavailable, open = time is available regardless of
      // any rule. One record type, two signs.
      { name: "kind", id: "sel_ae_kind", type: "select", maxSelect: 1, values: ["block", "open"], required: true, hidden: false, presentable: false, system: false },
      { name: "start", id: "date_ae_start", type: "date", min: "", max: "", required: true, hidden: false, presentable: false, system: false },
      { name: "end", id: "date_ae_end", type: "date", min: "", max: "", required: true, hidden: false, presentable: false, system: false },
      { name: "note", id: "txt_ae_note", type: "text", max: 200, min: 0, pattern: "", required: false, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      // an "open" exception may narrow which types it opens, same semantics as
      // availabilityRules.allowedTypes
      { name: "allowedTypes", id: "rel_ae_types", type: "relation", collectionId: "apptypes0000001", cascadeDelete: false, minSelect: 0, maxSelect: 50, required: false, hidden: false, presentable: false, system: false },
      // manual entries are never touched by the calendar import (stage 5)
      { name: "source", id: "sel_ae_source", type: "select", maxSelect: 1, values: ["manual", "imported"], required: false, hidden: false, presentable: false, system: false },
      // UID of the source calendar event, for incremental replacement
      { name: "externalId", id: "txt_ae_extid", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // which configured feed produced it, so one feed can be re-synced or
      // removed without touching the others
      { name: "feedRef", id: "txt_ae_feed", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "created", id: "autodate_ae_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_ae_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(exceptions);

  // --- the bookings themselves ------------------------------------------
  const appointments = new Collection({
    id: "appointments001",
    name: "appointments",
    type: "base",
    system: false,
    // customers see their own linked appointments ("Meine Termine"); anonymous
    // bookings are reached through the token link instead, which the cancel
    // endpoint resolves server-side.
    listRule: "@request.auth.isAdmin = true || (@request.auth.id != \"\" && user = @request.auth.id)",
    viewRule: "@request.auth.isAdmin = true || (@request.auth.id != \"\" && user = @request.auth.id)",
    // never created directly — /api/custom/booking owns this
    createRule: null,
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: "@request.auth.isAdmin = true",
    indexes: [
      "CREATE UNIQUE INDEX idx_ap_token ON appointments (token)",
      // the availability query: everything that still occupies time in a range
      "CREATE INDEX idx_ap_slot ON appointments (status, start, end)",
      "CREATE INDEX idx_ap_user ON appointments (user)",
      "CREATE INDEX idx_ap_email ON appointments (customerEmail)",
    ],
    fields: [
      { name: "type", id: "rel_ap_type", type: "relation", collectionId: "apptypes0000001", cascadeDelete: false, minSelect: 0, maxSelect: 1, required: true, hidden: false, presentable: false, system: false },
      { name: "start", id: "date_ap_start", type: "date", min: "", max: "", required: true, hidden: false, presentable: true, system: false },
      // start + durationMin; the buffer is NOT part of end — it is applied by
      // the collision check, so the customer never sees a padded appointment
      { name: "end", id: "date_ap_end", type: "date", min: "", max: "", required: true, hidden: false, presentable: false, system: false },
      // copies, not lookups: changing the type later must not retroactively
      // change an appointment already booked (same reasoning as orders/prices)
      { name: "durationMin", id: "num_ap_dur", type: "number", min: 1, max: 1440, onlyInt: true, required: true, hidden: false, presentable: false, system: false },
      { name: "bufferMin", id: "num_ap_buf", type: "number", min: 0, max: 480, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      { name: "price", id: "num_ap_price", type: "number", min: 0, max: null, onlyInt: false, required: false, hidden: false, presentable: false, system: false },
      { name: "typeName", id: "txt_ap_tname", type: "text", max: 80, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // pending = awaiting approval and holding the slot until it expires
      { name: "status", id: "sel_ap_status", type: "select", maxSelect: 1, values: ["pending", "confirmed", "cancelled", "declined", "expired"], required: true, hidden: false, presentable: false, system: false },
      { name: "customerName", id: "txt_ap_name", type: "text", max: 120, min: 0, pattern: "", required: false, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "customerEmail", id: "txt_ap_email", type: "email", exceptDomains: null, onlyDomains: null, required: false, hidden: false, presentable: false, system: false },
      { name: "customerPhone", id: "txt_ap_phone", type: "text", max: 40, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "message", id: "txt_ap_msg", type: "text", max: 1000, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // set only when the booking was made while signed in — that is an
      // authenticated fact. Anonymous bookings are linked by the photographer
      // by hand; the unverified e-mail field alone never links anything.
      { name: "user", id: "rel_ap_user", type: "relation", collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: 0, maxSelect: 1, required: false, hidden: false, presentable: false, system: false },
      // cancel/reschedule link in the confirmation mail. Whoever holds the
      // mail may act — the appointment belongs to the address it went to.
      { name: "token", id: "txt_ap_token", type: "text", max: 64, min: 0, pattern: "", required: false, hidden: true, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "source", id: "sel_ap_source", type: "select", maxSelect: 1, values: ["customer", "admin"], required: false, hidden: false, presentable: false, system: false },
      // proof of consent: without the timestamp and the text version the
      // consent cannot be evidenced later
      { name: "consentAt", id: "date_ap_cons", type: "date", min: "", max: "", required: false, hidden: false, presentable: false, system: false },
      { name: "consentVersion", id: "txt_ap_consv", type: "text", max: 40, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // pending bookings expire and release the slot again
      { name: "expiresAt", id: "date_ap_exp", type: "date", min: "", max: "", required: false, hidden: false, presentable: false, system: false },
      // guards against a restart or a second cron pass re-sending the reminder
      { name: "reminderSentAt", id: "date_ap_remind", type: "date", min: "", max: "", required: false, hidden: false, presentable: false, system: false },
      { name: "cancelledAt", id: "date_ap_canc", type: "date", min: "", max: "", required: false, hidden: false, presentable: false, system: false },
      { name: "cancelReason", id: "txt_ap_cancr", type: "text", max: 500, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // set by the retention job: personal fields are cleared, date/type/status
      // stay so the photographer keeps their statistics
      { name: "anonymizedAt", id: "date_ap_anon", type: "date", min: "", max: "", required: false, hidden: false, presentable: false, system: false },
      { name: "created", id: "autodate_ap_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_ap_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(appointments);

  // --- instance-wide settings -------------------------------------------
  const settings = app.findCollectionByNameOrId("settings");
  const add = (field) => settings.fields.add(new Field(field));

  // master switch: an instance that does not take bookings shows nothing
  add({ name: "bookingEnabled", id: "bool_set_bkon", type: "bool", required: false, hidden: false, presentable: false, system: false });
  // IANA zone, not a fixed offset — rules are wall clock all year round, and a
  // fixed offset would shift everything by an hour at the DST switch
  add({ name: "timezone", id: "txt_set_tz", type: "text", max: 64, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" });
  add({ name: "bookingHorizonDays", id: "num_set_bkhor", type: "number", min: 1, max: 730, onlyInt: true, required: false, hidden: false, presentable: false, system: false });
  // empty = unlimited
  add({ name: "bookingMaxPerDay", id: "num_set_bkmax", type: "number", min: 1, max: 100, onlyInt: true, required: false, hidden: false, presentable: false, system: false });
  add({ name: "bookingPendingExpiryHours", id: "num_set_bkexp", type: "number", min: 1, max: 720, onlyInt: true, required: false, hidden: false, presentable: false, system: false });
  add({ name: "bookingCancelDeadlineHours", id: "num_set_bkcan", type: "number", min: 0, max: 720, onlyInt: true, required: false, hidden: false, presentable: false, system: false });
  // 0 = no reminder
  add({ name: "bookingReminderHours", id: "num_set_bkrem", type: "number", min: 0, max: 720, onlyInt: true, required: false, hidden: false, presentable: false, system: false });
  add({ name: "bookingRetentionMonths", id: "num_set_bkret", type: "number", min: 1, max: 120, onlyInt: true, required: false, hidden: false, presentable: false, system: false });
  // off by default: it costs real bookings and barely slows a determined
  // attacker down (docs/terminbuchung.md §6)
  add({ name: "bookingDoubleOptIn", id: "bool_set_bkdoi", type: "bool", required: false, hidden: false, presentable: false, system: false });
  // appointment notifications go where the photographer looks *now*, which is
  // often not the accounting mailbox used for orders. Empty = contactEmail.
  add({ name: "bookingNotificationEmail", id: "txt_set_bkmail", type: "email", exceptDomains: null, onlyDomains: null, required: false, hidden: false, presentable: false, system: false });
  // origins allowed to frame /embed*, one per line. Everything else in the app
  // is served with frame-ancestors 'none'.
  add({ name: "bookingEmbedOrigins", id: "txt_set_bkorig", type: "text", max: 2000, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" });
  app.save(settings);

  // Defaults on the existing singleton. Only fills what is still empty so a
  // re-run cannot overwrite a configured instance.
  try {
    const record = app.findRecordById("settings", SETTINGS_ID);
    if (!record.getString("timezone")) {
      record.set("timezone", "Europe/Berlin");
    }
    if (!record.getInt("bookingHorizonDays")) {
      record.set("bookingHorizonDays", 90);
    }
    if (!record.getInt("bookingPendingExpiryHours")) {
      record.set("bookingPendingExpiryHours", 48);
    }
    if (!record.getInt("bookingCancelDeadlineHours")) {
      record.set("bookingCancelDeadlineHours", 24);
    }
    if (!record.getInt("bookingReminderHours")) {
      record.set("bookingReminderHours", 24);
    }
    if (!record.getInt("bookingRetentionMonths")) {
      record.set("bookingRetentionMonths", 12);
    }
    app.save(record);
  } catch (_) {
    // settings not seeded yet — 1782300001 seeds it, and the fields default to
    // empty, which the availability calculator reads as "use the fallbacks"
  }
}, (app) => {
  const drop = (name) => {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (_) {
      // already gone
    }
  };
  // reverse order of creation: relations point at appointmentTypes
  drop("appointments");
  drop("availabilityExceptions");
  drop("availabilityRules");
  drop("appointmentTypes");

  try {
    const settings = app.findCollectionByNameOrId("settings");
    [
      "bookingEnabled", "timezone", "bookingHorizonDays", "bookingMaxPerDay",
      "bookingPendingExpiryHours", "bookingCancelDeadlineHours",
      "bookingReminderHours", "bookingRetentionMonths", "bookingDoubleOptIn",
      "bookingNotificationEmail", "bookingEmbedOrigins",
    ].forEach((name) => settings.fields.removeByName(name));
    app.save(settings);
  } catch (_) {
    // settings collection gone — nothing to clean up
  }
});
