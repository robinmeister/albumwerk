/// <reference path="../pb_data/types.d.ts" />
// Refresh the auth e-mail templates: informal "du" tone (consistent with the
// rest of the app), a button-styled link, and a German email-change template
// (the previous one was still the English PocketBase default). The branded
// shell around these bodies is added at send time by pb_hooks/emails_auth.pb.js.
// {APP_URL}/{APP_NAME}/{TOKEN} resolve from the instance's meta.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  const btn = (label, href) =>
    '<p><a href="' + href + '" ' +
    "style=\"display:inline-block;padding:12px 24px;background:#3d4a3d;color:#ffffff;" +
    'text-decoration:none;border-radius:6px;font-weight:600">' + label + "</a></p>";

  users.verificationTemplate = {
    subject: "E-Mail bestätigen – {APP_NAME}",
    body:
      "<p>Hallo,</p>" +
      "<p>bitte bestätige deine E-Mail-Adresse mit einem Klick auf den Button:</p>" +
      btn("E-Mail-Adresse bestätigen", "{APP_URL}/verifyEmail?token={TOKEN}") +
      "<p>Danke,<br/>{APP_NAME}</p>",
  };
  users.resetPasswordTemplate = {
    subject: "Passwort zurücksetzen – {APP_NAME}",
    body:
      "<p>Hallo,</p>" +
      "<p>klicke auf den Button, um dein Passwort zurückzusetzen:</p>" +
      btn("Passwort zurücksetzen", "{APP_URL}/resetPassword?token={TOKEN}") +
      "<p>Falls du das nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.</p>" +
      "<p>Danke,<br/>{APP_NAME}</p>",
  };
  users.confirmEmailChangeTemplate = {
    subject: "Neue E-Mail-Adresse bestätigen – {APP_NAME}",
    body:
      "<p>Hallo,</p>" +
      "<p>klicke auf den Button, um deine neue E-Mail-Adresse zu bestätigen:</p>" +
      btn("Neue E-Mail-Adresse bestätigen", "{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}") +
      "<p>Falls du das nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.</p>" +
      "<p>Danke,<br/>{APP_NAME}</p>",
  };

  app.save(users);
}, (app) => {
  return null;
});
