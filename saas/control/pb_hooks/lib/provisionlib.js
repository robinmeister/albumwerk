/// <reference path="../../pb_data/types.d.ts" />
//
// Provisioning-Logik der Control-Plane — spiegelt saas/provision/*.sh, damit
// Skript- und Self-Service-Weg nicht divergieren. Wird per
// require(__hooks + "/lib/provisionlib.js") aus den isolierten JSVM-Handlern
// geladen. Konfiguration kommt aus Umgebungsvariablen (docker-compose/Coolify).

function env(key, fallback) {
  const v = $os.getenv(key);
  return v === "" || v === undefined ? (fallback === undefined ? "" : fallback) : v;
}

var RESERVED = ["www", "api", "admin", "status", "mail", "smtp", "app",
  "coolify", "kuma", "control", "signup", "demo", "test"];

function validateSubdomain(sub) {
  if (!/^[a-z0-9][a-z0-9-]{2,30}$/.test(sub)) {
    throw new Error("Ungültige Subdomain (erlaubt: a-z, 0-9, '-', 3-31 Zeichen)");
  }
  if (RESERVED.indexOf(sub) !== -1) {
    throw new Error("Diese Subdomain ist reserviert");
  }
}

// --- Coolify-API ---------------------------------------------------------
function coolifyApi(method, path, body) {
  const res = $http.send({
    url: env("COOLIFY_URL") + "/api/v1" + path,
    method: method,
    headers: {
      "Authorization": "Bearer " + env("COOLIFY_TOKEN"),
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: body ? JSON.stringify(body) : "",
    timeout: 60,
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error("Coolify " + method + " " + path + " -> HTTP " + res.statusCode +
      ": " + JSON.stringify(res.json || {}).slice(0, 300));
  }
  return res.json || {};
}

function randomPassword() {
  return $security.randomStringWithAlphabet(24,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
}

// Schritt 1-3 aus provision.sh: App + Volume + Ops-Env anlegen, Deploy starten.
// Gibt { uuid, url, opsEmail, opsPass } zurück (Health/Bootstrap macht der
// Worker-Cron asynchron, siehe signup.pb.js).
function createInstance(sub) {
  validateSubdomain(sub);
  const domain = env("SAAS_DOMAIN");
  const url = "https://" + sub + "." + domain;
  const opsEmail = "ops+" + sub + "@" + domain;
  const opsPass = randomPassword();

  const app = coolifyApi("POST", "/applications/dockerimage", {
    project_uuid: env("COOLIFY_PROJECT_UUID"),
    server_uuid: env("COOLIFY_SERVER_UUID"),
    environment_name: env("COOLIFY_ENVIRONMENT_NAME", "production"),
    docker_registry_image_name: env("APP_IMAGE"),
    docker_registry_image_tag: env("APP_TAG", "latest"),
    name: "kunde-" + sub,
    description: "Albumwerk-Instanz " + url,
    domains: url,
    ports_exposes: "8090",
    health_check_enabled: true,
    health_check_path: "/api/health",
    instant_deploy: false,
  });
  const uuid = app.uuid;
  if (!uuid) throw new Error("Coolify lieferte keine App-UUID");

  coolifyApi("POST", "/applications/" + uuid + "/storages", {
    type: "persistent",
    name: "pbdata-" + sub,
    mount_path: "/pb/pb_data",
  });
  coolifyApi("POST", "/applications/" + uuid + "/envs",
    { key: "PB_SUPERUSER_EMAIL", value: opsEmail });
  coolifyApi("POST", "/applications/" + uuid + "/envs",
    { key: "PB_SUPERUSER_PASSWORD", value: opsPass, is_shown_once: true });
  coolifyApi("POST", "/applications/" + uuid + "/start");

  return { uuid: uuid, url: url, opsEmail: opsEmail, opsPass: opsPass };
}

function stopInstance(uuid) { coolifyApi("POST", "/applications/" + uuid + "/stop"); }
function startInstance(uuid) { coolifyApi("POST", "/applications/" + uuid + "/start"); }

// Ist die Instanz erreichbar? (ein einzelner, schneller Check — der Worker
// pollt über Cron-Ticks statt zu blockieren)
function isHealthy(url) {
  try {
    const res = $http.send({ url: url + "/api/health", method: "GET", timeout: 10 });
    return res.statusCode === 200;
  } catch (_) {
    return false;
  }
}

// Schritt 5 aus provision.sh / bootstrap-instance.sh: SMTP + appURL setzen,
// Fotografen-Account (isAdmin) anlegen, Passwort-Setzen-Mail auslösen.
function bootstrapInstance(url, opsEmail, opsPass, customerEmail, customerName, sendWelcome) {
  const auth = $http.send({
    url: url + "/api/collections/_superusers/auth-with-password",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: opsEmail, password: opsPass }),
    timeout: 30,
  });
  if (auth.statusCode !== 200) {
    throw new Error("Instanz-Login fehlgeschlagen (HTTP " + auth.statusCode + ")");
  }
  const token = auth.json.token;

  const settings = { meta: { appURL: url } };
  if (env("SAAS_SMTP_HOST")) {
    settings.meta.senderAddress = env("SAAS_SMTP_SENDER");
    settings.meta.senderName = env("SAAS_SMTP_SENDER_NAME", "Albumwerk");
    settings.smtp = {
      enabled: true,
      host: env("SAAS_SMTP_HOST"),
      port: parseInt(env("SAAS_SMTP_PORT", "587"), 10),
      username: env("SAAS_SMTP_USER"),
      password: env("SAAS_SMTP_PASS"),
    };
  }
  const patch = $http.send({
    url: url + "/api/settings",
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify(settings),
    timeout: 30,
  });
  if (patch.statusCode !== 200) {
    throw new Error("Instanz-Settings fehlgeschlagen (HTTP " + patch.statusCode + ")");
  }

  const nameParts = String(customerName || "").split(" ");
  const pw = randomPassword();
  const create = $http.send({
    url: url + "/api/collections/users/records",
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({
      email: customerEmail,
      password: pw,
      passwordConfirm: pw,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" "),
      isAdmin: true,
      verified: true,
    }),
    timeout: 30,
  });
  if (create.statusCode < 200 || create.statusCode >= 300) {
    throw new Error("Fotografen-Account fehlgeschlagen (HTTP " + create.statusCode + ")");
  }

  // Passwort-setzen-Mail nur auf dem CLI-Weg: dort ist sie der einzige Zugang.
  // Beim Self-Service loggt die Warteseite den Kunden direkt ein (siehe
  // instanceLoginToken) — eine Mail weniger, und das Onboarding hängt nicht am
  // SMTP der gerade erst gebauten Instanz.
  if (sendWelcome === false) return;

  const reset = $http.send({
    url: url + "/api/collections/users/request-password-reset",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: customerEmail }),
    timeout: 30,
  });
  if (reset.statusCode !== 204) {
    throw new Error("Willkommensmail fehlgeschlagen (HTTP " + reset.statusCode + ")");
  }
}

// Direkteinstieg ohne Passwort: die Control-Plane kennt den Ops-Superuser der
// Instanz und lässt sich von PocketBase ein Nutzer-Token für den Fotografen
// ausstellen. Die Warteseite übergibt es beim Sprung in die App.
// Gilt bewusst kurz — wer es verpasst, kommt über "Passwort vergessen" rein.
function instanceLoginToken(url, opsEmail, opsPass, customerEmail, seconds) {
  const auth = $http.send({
    url: url + "/api/collections/_superusers/auth-with-password",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: opsEmail, password: opsPass }),
    timeout: 30,
  });
  if (auth.statusCode !== 200) {
    throw new Error("Instanz-Login fehlgeschlagen (HTTP " + auth.statusCode + ")");
  }
  const token = auth.json.token;

  const list = $http.send({
    url: url + "/api/collections/users/records?perPage=1&filter=" +
      encodeURIComponent('email="' + customerEmail + '"'),
    headers: { "Authorization": token },
    timeout: 30,
  });
  const items = (list.json || {}).items || [];
  if (!items.length) throw new Error("Fotografen-Account nicht gefunden");

  const imp = $http.send({
    url: url + "/api/collections/users/impersonate/" + items[0].id,
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ duration: seconds || 1800 }),
    timeout: 30,
  });
  if (imp.statusCode !== 200) {
    throw new Error("Login-Token fehlgeschlagen (HTTP " + imp.statusCode + ")");
  }
  return imp.json.token;
}

// Öffentliche Adresse der Control-Plane (Bestätigungslinks, Warteseite).
function controlUrl() {
  return env("CONTROL_URL", "https://control." + env("SAAS_DOMAIN"));
}

// Einfache Control-Plane-Mail (nutzt das SMTP der Control-Plane-Instanz)
function sendMail(app, to, subject, html) {
  const client = app.newMailClient();
  client.send(new MailerMessage({
    from: {
      address: app.settings().meta.senderAddress,
      name: app.settings().meta.senderName || "Albumwerk",
    },
    to: [{ address: to }],
    subject: subject,
    html: html,
  }));
}

module.exports = {
  env: env,
  validateSubdomain: validateSubdomain,
  coolifyApi: coolifyApi,
  createInstance: createInstance,
  stopInstance: stopInstance,
  startInstance: startInstance,
  isHealthy: isHealthy,
  bootstrapInstance: bootstrapInstance,
  instanceLoginToken: instanceLoginToken,
  controlUrl: controlUrl,
  sendMail: sendMail,
  randomPassword: randomPassword,
};
