// Höhenmeldung an die einbettende Seite (docs/terminbuchung.md §9.3).
//
// Ein iframe hat eine feste Höhe. Wechselt der Inhalt von der Monatsübersicht
// zum Formular, entstünde ohne diese Meldung ein Scrollbalken *innerhalb* des
// Rahmens — auf Mobilgeräten praktisch unbenutzbar. Die Seite meldet deshalb
// ihre tatsächliche Höhe nach oben, das Loader-Script auf der Website der
// Fotograf:in (public/embed.js) setzt sie.
//
// `postMessage` mit "*" als Ziel ist hier richtig: Wir wissen nicht, auf
// welcher Domain wir eingebettet sind — genau das ist der Sinn der Einbettung.
// Übertragen wird ausschließlich eine Zahl; es gibt nichts, was ein
// mitlesendes Elternfenster missbrauchen könnte. Die Zugriffskontrolle in die
// andere Richtung (wer darf uns überhaupt einbetten) macht der
// CSP-Header `frame-ancestors`, nicht diese Nachricht.

export const HEIGHT_MESSAGE = 'albumwerk:booking:height'

/**
 * Meldet die Dokumenthöhe an das Elternfenster, sobald sie sich ändert.
 * Gibt eine Abmeldefunktion zurück.
 */
export function reportHeight(element: HTMLElement): () => void {
  if (window.parent === window) {
    // nicht eingebettet — als eigenständige Buchungsseite aufgerufen
    return () => {}
  }

  let lastHeight = -1

  const send = () => {
    // Ganzzahlig aufrunden: Bruchteile eines Pixels lösen sonst eine
    // Endlosschleife aus Meldung → Größenänderung → Meldung aus.
    const height = Math.ceil(element.getBoundingClientRect().height)
    if (height === lastHeight || height <= 0) {
      return
    }
    lastHeight = height
    window.parent.postMessage({ type: HEIGHT_MESSAGE, height }, '*')
  }

  const observer = new ResizeObserver(send)
  observer.observe(element)
  send()

  return () => observer.disconnect()
}
