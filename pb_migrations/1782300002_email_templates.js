/// <reference path="../pb_data/types.d.ts" />
// Point the auth email links at the SPA instead of the PocketBase dashboard:
// verification -> /verifyEmail?token=..., password reset -> /resetPassword?token=...
// {APP_URL} resolves from the instance's meta.appURL (set in SETUP.md).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.verificationTemplate = {
    subject: "E-Mail bestätigen – {APP_NAME}",
    body:
      "<p>Hallo,</p>" +
      "<p>bitte bestätigen Sie Ihre E-Mail-Adresse mit einem Klick auf den folgenden Link:</p>" +
      '<p><a href="{APP_URL}/verifyEmail?token={TOKEN}">E-Mail-Adresse bestätigen</a></p>' +
      "<p>Danke,<br/>{APP_NAME}</p>",
  };
  users.resetPasswordTemplate = {
    subject: "Passwort zurücksetzen – {APP_NAME}",
    body:
      "<p>Hallo,</p>" +
      "<p>klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>" +
      '<p><a href="{APP_URL}/resetPassword?token={TOKEN}">Passwort zurücksetzen</a></p>' +
      "<p>Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>" +
      "<p>Danke,<br/>{APP_NAME}</p>",
  };

  app.save(users);
}, (app) => {
  return null;
});
