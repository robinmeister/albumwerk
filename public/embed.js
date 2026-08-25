/*
 * Albumwerk — Loader für die eingebettete Terminbuchung.
 *
 * Wird auf der Website der Fotograf:in eingebunden. Der Snippet-Generator im
 * Admin (Etappe 4) erzeugt genau diesen Aufruf:
 *
 *   <script src="https://fotos.beispiel.de/embed.js"
 *           data-albumwerk-booking
 *           data-type="portraitshooting"></script>
 *
 * Das Script legt an seiner eigenen Stelle einen iframe an und passt dessen
 * Höhe an den Inhalt an. Ohne diese Anpassung entsteht beim Wechsel von der
 * Monatsübersicht zum Formular ein Scrollbalken *innerhalb* des Rahmens — auf
 * Mobilgeräten praktisch unbenutzbar.
 *
 * Bewusst in ES5 ohne Abhängigkeiten: Es läuft auf fremden Websites, teils in
 * Baukästen mit alten Browsern, und darf dort nichts kaputt machen. Wer gar
 * kein eigenes JavaScript einbinden kann (Jimdo, Wix), bekommt vom Generator
 * einen reinen <iframe> mit fester Höhe als Rückfallebene.
 */
(function () {
  'use strict'

  var HEIGHT_MESSAGE = 'albumwerk:booking:height'
  var MIN_HEIGHT = 420

  // document.currentScript zeigt beim Ausführen auf dieses <script>-Element.
  // Ältere Browser kennen es nicht — dann nehmen wir das zuletzt eingefügte,
  // was während des Parsens immer dieses hier ist.
  var script = document.currentScript
  if (!script) {
    var all = document.getElementsByTagName('script')
    script = all[all.length - 1]
  }
  if (!script || !script.src) {
    return
  }

  // Die Instanz ist die Herkunft dieses Scripts — die Fotograf:in muss keine
  // zweite Adresse eintragen und kann sie auch nicht falsch eintragen.
  var origin = script.src.replace(/\/embed\.js(\?.*)?$/, '')

  var url = origin + '/embed/'
  var type = script.getAttribute('data-type')
  if (type) {
    url += '?type=' + encodeURIComponent(type)
  }

  var frame = document.createElement('iframe')
  frame.src = url
  frame.title = 'Termin buchen'
  frame.loading = 'lazy'
  frame.style.width = '100%'
  frame.style.border = '0'
  frame.style.display = 'block'
  frame.style.height = MIN_HEIGHT + 'px'
  // Nur das, was die Buchung tatsächlich braucht. Kein allow-top-navigation:
  // ein eingebetteter Kalender darf die Seite der Fotograf:in nicht wegnavigieren.
  frame.setAttribute('scrolling', 'no')

  script.parentNode.insertBefore(frame, script)

  window.addEventListener('message', function (event) {
    // Nur Nachrichten aus genau diesem iframe annehmen. Ohne diese Prüfung
    // könnte jedes andere eingebettete Fenster die Höhe verstellen.
    if (event.source !== frame.contentWindow) return
    if (event.origin !== origin) return

    var data = event.data
    if (!data || data.type !== HEIGHT_MESSAGE) return

    var height = parseInt(data.height, 10)
    if (!height || height < 0 || height > 20000) return

    frame.style.height = Math.max(height, MIN_HEIGHT) + 'px'
  })
})()
