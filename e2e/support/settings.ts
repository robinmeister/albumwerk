// Sichern und Zurückschreiben des globalen Settings-Records.
//
// Branding, Rechtstexte und Zahlungen schreiben alle auf denselben Record
// (`appsettings0001`, siehe src/config/settings.ts). Dieser Zustand lässt sich
// nicht über Fixtures isolieren — die betroffenen Tests laufen deshalb als
// eigenes, serielles Projekt und stellen den Ausgangszustand danach wieder her.
//
// Die Sicherung landet zusätzlich auf der Platte, damit ein abgebrochener Lauf
// (Strg-C) die Dev-Instanz nicht dauerhaft umgefärbt zurücklässt:
// `make e2e-clean` schreibt sie dann nachträglich zurück.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { PbAdmin } from "./pb";

const here = dirname(fileURLToPath(import.meta.url));
export const SETTINGS_BACKUP = resolve(here, "../.artifacts/settings-backup.json");

export const SETTINGS_ID = "appsettings0001";

/** Von PocketBase verwaltet — nicht zurückschreibbar. */
const SYSTEMFELDER = new Set(["id", "collectionId", "collectionName", "created", "updated"]);

export async function einstellungenSichern(pb: PbAdmin): Promise<void> {
  const aktuell = await pb.get("settings", SETTINGS_ID);
  const daten = Object.fromEntries(
    Object.entries(aktuell).filter(([key]) => !SYSTEMFELDER.has(key)),
  );
  await mkdir(dirname(SETTINGS_BACKUP), { recursive: true });
  await writeFile(SETTINGS_BACKUP, JSON.stringify(daten, null, 2), "utf8");
}

export async function einstellungenWiederherstellen(pb: PbAdmin): Promise<boolean> {
  let daten: Record<string, unknown>;
  try {
    daten = JSON.parse(await readFile(SETTINGS_BACKUP, "utf8"));
  } catch {
    return false; // nichts zu tun
  }
  await pb.update("settings", SETTINGS_ID, daten);
  await rm(SETTINGS_BACKUP, { force: true });
  return true;
}
