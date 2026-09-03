import { useEffect, useState } from "react";

import { pb } from "../config/pocketbase";
import { countUnread, watchTickets } from "../utils/support";

// Zaehler fuer den Support-Eintrag in der Seitenleiste. Statt den Stand aus
// den Ereignissen fortzuschreiben wird bei jedem Ereignis neu gezaehlt: eine
// winzige Abfrage, dafuer kann der Zaehler nicht auseinanderlaufen, wenn ein
// Ereignis verloren geht oder in zwei Tabs gleichzeitig gelesen wird.
export default function useSupportUnread(isAdmin: boolean): number {
  const [anzahl, setAnzahl] = useState(0);

  useEffect(() => {
    if (!pb.authStore.isValid) return;
    let aktiv = true;

    const zaehlen = () => {
      countUnread(isAdmin)
        .then((n) => { if (aktiv) setAnzahl(n); })
        .catch(() => undefined);
    };

    zaehlen();
    const abmelden = watchTickets(zaehlen);
    return () => {
      aktiv = false;
      abmelden();
    };
  }, [isAdmin]);

  return anzahl;
}
