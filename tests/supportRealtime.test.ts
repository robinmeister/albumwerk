import { describe, expect, it, vi } from "vitest";

// Das SDK verliert Abos, wenn in schneller Folge an- und abgemeldet wird.
// support.ts haelt deshalb pro Collection genau ein Abo und verteilt die
// Ereignisse selbst — genau das wird hier festgenagelt.
type Handler = (event: { action: string; record: unknown }) => void;

const { abos } = vi.hoisted(() => ({
  abos: [] as { collection: string; handler: Handler }[],
}));

vi.mock("../src/config/pocketbase", () => ({
  pb: {
    collection: (collection: string) => ({
      subscribe: (_topic: string, handler: Handler) => {
        abos.push({ collection, handler });
        return Promise.resolve(() => undefined);
      },
    }),
  },
}));

const { watchMessages, watchTickets } = await import("../src/utils/support");

const handlerFuer = (collection: string): Handler =>
  abos.find((a) => a.collection === collection)!.handler;

describe("Support-Realtime", () => {
  it("abonniert eine Collection nur einmal, egal wie viele zuhoeren", () => {
    const ab1 = watchTickets(() => undefined);
    const ab2 = watchTickets(() => undefined);
    expect(abos.filter((a) => a.collection === "supportTickets")).toHaveLength(1);
    ab1();
    ab2();
    // Auch nach dem Abmelden bleibt das Abo stehen und wird nicht neu aufgebaut.
    watchTickets(() => undefined)();
    expect(abos.filter((a) => a.collection === "supportTickets")).toHaveLength(1);
  });

  it("verteilt ein Ereignis an alle Zuhoerer und nicht mehr an abgemeldete", () => {
    const gesehen: string[] = [];
    const ab1 = watchTickets(() => gesehen.push("eins"));
    const ab2 = watchTickets(() => gesehen.push("zwei"));
    const handler = handlerFuer("supportTickets");

    handler({ action: "update", record: {} });
    expect(gesehen).toEqual(["eins", "zwei"]);

    ab1();
    handler({ action: "update", record: {} });
    expect(gesehen).toEqual(["eins", "zwei", "zwei"]);
    ab2();
  });

  it("reicht nur neue Nachrichten des eigenen Verlaufs weiter", () => {
    const angekommen: string[] = [];
    const ab = watchMessages("t1", (m) => angekommen.push(m.id));
    const handler = handlerFuer("supportMessages");

    handler({ action: "create", record: { id: "m1", ticketId: "t1" } });
    handler({ action: "create", record: { id: "m2", ticketId: "t2" } });
    handler({ action: "update", record: { id: "m3", ticketId: "t1" } });

    expect(angekommen).toEqual(["m1"]);
    ab();
  });
});
