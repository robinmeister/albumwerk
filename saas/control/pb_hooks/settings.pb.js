/// <reference path="../pb_data/types.d.ts" />
//
// Die Control-Plane verschickt selbst Mails (Trial-Erinnerung, Ablauf,
// Support-Weiterleitung). Ohne konfiguriertes SMTP fällt PocketBase auf das
// sendmail-Binary zurück, das im Alpine-Image nicht existiert
// ("GoError: exit status 1"). Darum beim Start aus den SAAS_SMTP_*-Envs
// dieselben Werte setzen, die auch die Kunden-Instanzen bekommen.

onBootstrap((e) => {
  e.next();

  const host = $os.getenv("SAAS_SMTP_HOST");
  if (!host) return;

  const s = $app.settings();
  s.smtp.enabled = true;
  s.smtp.host = host;
  s.smtp.port = parseInt($os.getenv("SAAS_SMTP_PORT") || "587", 10);
  s.smtp.username = $os.getenv("SAAS_SMTP_USER");
  s.smtp.password = $os.getenv("SAAS_SMTP_PASS");
  s.meta.senderAddress = $os.getenv("SAAS_SMTP_SENDER") || s.meta.senderAddress;
  s.meta.senderName = $os.getenv("SAAS_SMTP_SENDER_NAME") || "Albumwerk";
  $app.save(s);

  $app.logger().info("control-plane smtp configured", "host", host);
});
