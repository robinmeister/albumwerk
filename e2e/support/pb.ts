// Direkter PocketBase-Zugriff für Fixtures — Testdaten werden über die API
// angelegt, nicht durch Klicken. Das hält die Tests auf den Workflow fokussiert,
// den sie prüfen sollen, statt jedes Mal die halbe App durchzuspielen.
//
// Aufräumen läuft über ein festes Record-ID-Präfix (siehe E2E_ID_PREFIX) und
// nicht über sichtbare Namen: die Fixture-Namen sollen doku-tauglich sein, weil
// dieselben Läufe die Screenshots für die Hilfe-Artikel erzeugen.

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8091";

/** Superuser der Dev-Instanz (docker-compose.dev.yml). */
const SUPERUSER = {
  identity: process.env.E2E_PB_EMAIL ?? "admin@demo.test",
  password: process.env.E2E_PB_PASSWORD ?? "demo123456",
};

/**
 * Alle von der Suite angelegten Records tragen dieses ID-Präfix. PocketBase-IDs
 * sind 15 Zeichen lang und tauchen nirgends in der Oberfläche auf — damit lässt
 * sich zuverlässig aufräumen, ohne dass die Screenshots "e2e-Testalbum" zeigen.
 */
export const E2E_ID_PREFIX = "e2e";

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function e2eId(): string {
  let rest = "";
  for (let i = 0; i < 15 - E2E_ID_PREFIX.length; i += 1) {
    rest += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return E2E_ID_PREFIX + rest;
}

export type PbRecord = Record<string, any> & { id: string };

export class PbAdmin {
  private token = "";

  async login(): Promise<void> {
    if (this.token) return;
    const res = await fetch(
      `${BASE_URL}/api/collections/_superusers/auth-with-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SUPERUSER),
      },
    );
    if (!res.ok) {
      throw new Error(
        `Superuser-Login fehlgeschlagen (${res.status}). Läuft die Dev-Instanz? ` +
          `Start: make dev`,
      );
    }
    this.token = ((await res.json()) as { token: string }).token;
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    await this.login();
    const headers = new Headers(init.headers);
    headers.set("Authorization", this.token);
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    if (!res.ok) {
      throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${await res.text()}`);
    }
    return res.status === 204 ? null : res.json();
  }

  create(collection: string, data: Record<string, unknown>): Promise<PbRecord> {
    return this.request(`/api/collections/${collection}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  update(collection: string, id: string, data: Record<string, unknown>): Promise<PbRecord> {
    return this.request(`/api/collections/${collection}/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  get(collection: string, id: string): Promise<PbRecord> {
    return this.request(`/api/collections/${collection}/records/${id}`);
  }

  async list(collection: string, filter?: string): Promise<PbRecord[]> {
    const query = new URLSearchParams({ perPage: "500" });
    if (filter) query.set("filter", filter);
    const page = await this.request(`/api/collections/${collection}/records?${query}`);
    return page.items as PbRecord[];
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      await this.request(`/api/collections/${collection}/records/${id}`, { method: "DELETE" });
    } catch (err) {
      // 404 heißt: schon weg (z. B. per Cascade). Alles andere ist echt.
      if (!String(err).includes("404")) throw err;
    }
  }

  /**
   * Legt einen Record mit Dateianhang an (multipart).
   *
   * Mehrwertige Felder (Relationen wie `userIds`, `priceIds`) werden als Array
   * übergeben und einzeln angehängt — als JSON-String verstünde PocketBase sie
   * im multipart-Modus nicht.
   */
  async createWithFile(
    collection: string,
    data: Record<string, string | string[] | boolean>,
    fileField: string,
    filePath: string,
  ): Promise<PbRecord> {
    await this.login();
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) value.forEach((entry) => form.append(key, entry));
      else form.append(key, String(value));
    }
    const buffer = await readFile(filePath);
    form.append(fileField, new Blob([buffer], { type: "image/jpeg" }), basename(filePath));

    const res = await fetch(`${BASE_URL}/api/collections/${collection}/records`, {
      method: "POST",
      headers: { Authorization: this.token },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Upload nach ${collection} → ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  /** Auth-Token für einen App-Nutzer — für die Anmeldung ohne UI-Umweg. */
  async userToken(email: string, password: string): Promise<{ token: string; record: PbRecord }> {
    const res = await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: email, password }),
    });
    if (!res.ok) throw new Error(`Login als ${email} → ${res.status}: ${await res.text()}`);
    return res.json();
  }

  /** Löscht alle Reste der Suite. Wird vom Teardown und von `make e2e-clean` genutzt. */
  async purgeFixtures(): Promise<number> {
    // Reihenfolge zählt: images vor shootings, shootings vor users.
    const collections = [
      "images",
      "userSelection",
      "orders",
      "finishedOrders",
      "supportMessages",
      "supportTickets",
      "shootings",
      "users",
      "helpArticles",
    ];
    let removed = 0;
    for (const collection of collections) {
      let items: PbRecord[] = [];
      try {
        // Explizites % verhindert PocketBases automatisches Umschließen — so
        // matcht der Filter wirklich nur den Präfix und nicht "e2e" irgendwo.
        items = await this.list(collection, `id ~ "${E2E_ID_PREFIX}%"`);
      } catch {
        continue; // Collection existiert in dieser Instanz nicht
      }
      for (const item of items) {
        await this.delete(collection, item.id);
        removed += 1;
      }
    }
    return removed;
  }
}
