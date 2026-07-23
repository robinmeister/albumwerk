/// <reference path="../pb_data/types.d.ts" />
// Support ticket system: customers open tickets, the instance admin answers them
// in-app, and technical (software) problems are forwarded to the vendor by
// pb_hooks/support.pb.js.
//
// Routing fields (target/status/forwardState) are written by hooks via
// app.save(), never by the client — hence updateRule = admins only. The
// per-request fields the client *may* set are enforced in the create hook.
//
// supportMessages uses a real relation to supportTickets so the API rule can
// traverse `ticketId.userId` — the rest of this schema uses plain text ids, but
// traversal is what keeps one customer from reading another's thread.

migrate((app) => {
  const tickets = new Collection({
    name: "supportTickets",
    type: "base",
    system: false,
    listRule: "@request.auth.isAdmin = true || userId = @request.auth.id",
    viewRule: "@request.auth.isAdmin = true || userId = @request.auth.id",
    createRule: "@request.auth.id != \"\" && userId = @request.auth.id",
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: "@request.auth.isAdmin = true",
    indexes: [
      "CREATE INDEX idx_st_status ON supportTickets (status, lastMessageAt)",
      "CREATE INDEX idx_st_user ON supportTickets (userId)",
    ],
    fields: [
      { name: "userId", id: "rel_st_user", type: "relation", collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: 0, maxSelect: 1, required: true, hidden: false, presentable: false, system: false },
      { name: "subject", id: "txt_st_subject", type: "text", max: 120, min: 1, pattern: "", required: true, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "category", id: "sel_st_cat", type: "select", maxSelect: 1, values: ["technical", "album", "order", "billing", "other"], required: true, hidden: false, presentable: false, system: false },
      // who owns the ticket: the instance admin, or the software vendor
      { name: "target", id: "sel_st_target", type: "select", maxSelect: 1, values: ["admin", "vendor"], required: false, hidden: false, presentable: false, system: false },
      { name: "status", id: "sel_st_status", type: "select", maxSelect: 1, values: ["open", "waiting", "resolved", "closed"], required: false, hidden: false, presentable: false, system: false },
      // error/environment payload captured by src/utils/errorReport.ts
      { name: "context", id: "json_st_ctx", type: "json", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      // reporter agreed that their data may be passed on to the vendor
      { name: "consentForward", id: "bool_st_consent", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "forwardState", id: "sel_st_fwd", type: "select", maxSelect: 1, values: ["none", "sent", "failed"], required: false, hidden: false, presentable: false, system: false },
      { name: "forwardedAt", id: "date_st_fwdat", type: "date", min: "", max: "", required: false, hidden: false, presentable: false, system: false },
      // id of the corresponding supportReports record in the control plane
      { name: "forwardRef", id: "txt_st_fwdref", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "forwardError", id: "txt_st_fwderr", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "lastMessageAt", id: "date_st_lastmsg", type: "date", min: "", max: "", required: false, hidden: false, presentable: false, system: false },
      { name: "unreadForAdmin", id: "bool_st_unradm", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "unreadForUser", id: "bool_st_unrusr", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "created", id: "autodate_st_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_st_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(tickets);

  const ticketsId = app.findCollectionByNameOrId("supportTickets").id;

  const messages = new Collection({
    name: "supportMessages",
    type: "base",
    system: false,
    listRule: "@request.auth.isAdmin = true || ticketId.userId = @request.auth.id",
    viewRule: "@request.auth.isAdmin = true || ticketId.userId = @request.auth.id",
    createRule: "@request.auth.id != \"\" && (@request.auth.isAdmin = true || ticketId.userId = @request.auth.id)",
    // a support thread is a record of what was said — nobody edits it after the fact
    updateRule: null,
    deleteRule: null,
    indexes: [
      "CREATE INDEX idx_sm_ticket ON supportMessages (ticketId, created)",
    ],
    fields: [
      { name: "ticketId", id: "rel_sm_ticket", type: "relation", collectionId: ticketsId, cascadeDelete: true, minSelect: 0, maxSelect: 1, required: true, hidden: false, presentable: false, system: false },
      { name: "authorId", id: "rel_sm_author", type: "relation", collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: 0, maxSelect: 1, required: false, hidden: false, presentable: false, system: false },
      { name: "authorRole", id: "sel_sm_role", type: "select", maxSelect: 1, values: ["user", "admin", "vendor"], required: false, hidden: false, presentable: false, system: false },
      { name: "body", id: "txt_sm_body", type: "text", max: 5000, min: 1, pattern: "", required: true, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // screenshots are half the value of a support thread
      { name: "attachments", id: "file_sm_att", type: "file", maxSelect: 3, maxSize: 5242880, mimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"], thumbs: null, protected: false, required: false, hidden: false, presentable: false, system: false },
      { name: "created", id: "autodate_sm_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_sm_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(messages);
}, (app) => {
  // messages first — the relation cascades, but the collection itself must go
  for (const name of ["supportMessages", "supportTickets"]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (_) {
      // already gone
    }
  }
});
