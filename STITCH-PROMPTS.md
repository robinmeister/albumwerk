# Albumwerk-App – Stitch-Prompts für die fehlenden Seiten

Projekt `13186504385365145016`, Design-System `assets/063894c0d3e444bead2f320db661b2eb`,
Modell Gemini 3.5 Flash Lite. Im Stitch-Web wird das Design-System einmal am Projekt
gewählt, dann reicht der Prompt-Text.

Jeder Prompt beginnt mit der 24px-Leiste `APP · GERÄT · SEITE`, damit die Screens
nach Projekt und Gerät gruppierbar bleiben. Mobil-Prompts erzwingen die Breite über
"390px breite Spalte mittig" — `deviceType: MOBILE` allein genügt nicht.

## Konto und Anmeldung

### REGISTRIEREN — Desktop

```
Albumwerk – Registrieren (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · REGISTRIEREN". Darunter auf Barytpapier eine zweigeteilte Fläche: links eine ruhige Bildfläche, rechts mittig eine schmale Spalte mit Fraunces-Überschrift "Konto anlegen", Feldern für Name, E-Mail und Passwort, einem dunklen Knopf "Registrieren" über die volle Spaltenbreite und darunter der Zeile "Schon ein Konto? Anmelden".
```

### REGISTRIEREN — Mobil

```
Albumwerk – Registrieren (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · REGISTRIEREN". Darunter auf Barytpapier: Wortmarke "Albumwerk", Fraunces-Überschrift "Konto anlegen", Felder Vorname, Nachname, E-Mail-Adresse, Passwort mit Hinweis "Mindestens 8 Zeichen.", Passwort wiederholen, dunkler Knopf "Registrieren" über die volle Breite, feine Trennlinie, Link "Schon ein Konto? Anmelden", schmaler Footer.
```

### PASSWORT VERGESSEN — Desktop

```
Albumwerk – Passwort vergessen (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · PASSWORT VERGESSEN". Darunter eine zentrierte schmale Spalte auf Barytpapier: Wortmarke "Albumwerk", Fraunces-Überschrift "Passwort vergessen", kurzer Absatz "Wir schicken dir einen Link zum Zurücksetzen.", Feld E-Mail-Adresse, dunkler Knopf "Link anfordern", darunter Textlink "Zurück zur Anmeldung". Viel Weißraum, schmaler Footer.
```

### PASSWORT VERGESSEN — Mobil

```
Albumwerk – Passwort vergessen (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · PASSWORT VERGESSEN". Darunter auf Barytpapier: Wortmarke "Albumwerk", Fraunces-Überschrift "Passwort vergessen", kurzer Absatz "Wir schicken dir einen Link zum Zurücksetzen.", Feld E-Mail-Adresse, dunkler Knopf "Link anfordern" über die volle Breite, Textlink "Zurück zur Anmeldung", schmaler Footer.
```

### PASSWORT ZURÜCKSETZEN — Desktop

```
Albumwerk – Passwort zurücksetzen (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · PASSWORT ZURÜCKSETZEN". Darunter eine zentrierte schmale Spalte auf Barytpapier: Wortmarke "Albumwerk", Fraunces-Überschrift "Passwort zurücksetzen", Feld "Neues Passwort" mit Hinweis "Mindestens 8 Zeichen.", Feld "Passwort wiederholen", dunkler Knopf "Passwort speichern", darunter ein Hinweis in Kleintext "Ungültiger oder fehlender Link. Bitte fordere einen neuen an." als dezente Fehlerzeile. Schmaler Footer.
```

### PASSWORT ZURÜCKSETZEN — Mobil

```
Albumwerk – Passwort zurücksetzen (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · PASSWORT ZURÜCKSETZEN". Darunter auf Barytpapier: Wortmarke "Albumwerk", Fraunces-Überschrift "Passwort zurücksetzen", Feld "Neues Passwort" mit Hinweis "Mindestens 8 Zeichen.", Feld "Passwort wiederholen", dunkler Knopf "Passwort speichern" über die volle Breite, eine dezente Fehlerzeile in Kleintext, schmaler Footer.
```

### E-MAIL BESTÄTIGEN — Desktop

```
Albumwerk – E-Mail bestätigen (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · E-MAIL BESTÄTIGEN". Darunter eine ruhige, mittig gesetzte Seite auf Barytpapier: kleine Kennzeichnung "Fast fertig" in Martian Mono, Fraunces-Überschrift "Bitte bestätige deine E-Mail-Adresse", kurzer Absatz mit Hinweis auf die verschickte Mail, ein Textknopf "Erneut senden" mit feiner Kontur und darunter der dunkle Knopf "Weiter zum Album". Kleintext "Der Bestätigungslink ist ungültig oder abgelaufen." als dezente Hinweiszeile. Schmaler Footer.
```

### E-MAIL BESTÄTIGEN — Mobil

```
Albumwerk – E-Mail bestätigen (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · E-MAIL BESTÄTIGEN". Darunter auf Barytpapier: kleine Kennzeichnung "Fast fertig" in Martian Mono, Fraunces-Überschrift "Bitte bestätige deine E-Mail-Adresse", kurzer Absatz, Knopf mit feiner Kontur "Erneut senden", dunkler Knopf "Weiter zum Album" über die volle Breite, dezente Hinweiszeile in Kleintext, schmaler Footer.
```

### AKTIONSSEITE — Desktop

```
Albumwerk – Aktion bestätigt (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · AKTIONSSEITE". Darunter eine sehr ruhige, mittig gesetzte Rückmeldeseite auf Barytpapier: kleine Kennzeichnung "Erledigt" in Martian Mono, Fraunces-Überschrift "E-Mail erfolgreich bestätigt", ein Satz Fließtext, ein dunkler Knopf "Zum Album" und darunter ein Textlink "Zur Anmeldung". Sehr viel Weißraum, keine Navigation, schmaler Footer.
```

### AKTIONSSEITE — Mobil

```
Albumwerk – Aktion bestätigt (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · AKTIONSSEITE". Darunter auf Barytpapier: kleine Kennzeichnung "Erledigt" in Martian Mono, Fraunces-Überschrift "E-Mail erfolgreich bestätigt", ein Satz Fließtext, dunkler Knopf "Zum Album" über die volle Breite, Textlink "Zur Anmeldung", viel Weißraum, schmaler Footer.
```

## Kundenbereich

### MEINE ALBEN — Desktop

```
Albumwerk – Meine Alben (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · MEINE ALBEN". Darunter auf Barytpapier: Fraunces-Überschrift "Meine Alben", rechts ein dunkler Knopf "Album hinzufügen", darunter eine Zeile mit Suchfeld "Suchen…" und zwei Filtern "Öffentlich" und "Bezahlt". Dann ein dreispaltiges Raster aus sechs flachen Albumkacheln ohne Rahmen: Titelbild bündig oben, darunter Albumtitel in Fraunces, Datum und Bildanzahl in Martian Mono, eine kleine Statusmarkierung. Unten eine leere Zeile mit dem Hinweis "Noch kein Album vorhanden."
```

### MEINE ALBEN — Mobil

```
Albumwerk – Meine Alben (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · MEINE ALBEN". Darunter: Kopfzeile mit Menüsymbol, Fraunces-Überschrift "Meine Alben", Suchfeld "Suchen…", waagerechte Filterzeile "Alle", "Öffentlich", "Bezahlt". Dann vier gestapelte Albumkacheln mit Titelbild, Albumtitel in Fraunces, Datum und Bildanzahl in Martian Mono, kleiner Statusmarkierung. Unten ein dunkler Knopf "Album hinzufügen" über die volle Breite.
```

### ALBUM HINZUFÜGEN — Desktop

```
Albumwerk – Album hinzufügen (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · ALBUM HINZUFÜGEN". Darunter eine zentrierte schmale Spalte auf Barytpapier: Fraunces-Überschrift "Album hinzufügen", kurzer Absatz "QR-Code scannen oder Code eingeben", ein großes flaches Feld für den Albumcode in Martian Mono mit weiten Zeichenabständen, darunter ein dunkler Knopf "Album öffnen". Eine feine Trennlinie, darunter ein ruhiger Kasten mit Kamerasymbol und dem Hinweis, den QR-Code des Fotografen zu scannen. Unten Textlink "Zu meinen Alben".
```

### ALBUM HINZUFÜGEN — Mobil

```
Albumwerk – Album hinzufügen (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · ALBUM HINZUFÜGEN". Darunter auf Barytpapier: Kopfzeile mit Zurückpfeil, Fraunces-Überschrift "Album hinzufügen", ein großer ruhiger Kasten mit Kamerasymbol für den QR-Scan, darunter der Hinweis "QR-Code scannen oder Code eingeben", ein Feld für den Albumcode in Martian Mono, dunkler Knopf "Album öffnen" über die volle Breite, Textlink "Zu meinen Alben".
```

### BESTELLDETAILS — Desktop

```
Albumwerk – Bestelldetails (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · BESTELLDETAILS". Darunter auf Barytpapier: Textlink "Zurück zu Bestellungen", Fraunces-Überschrift "Bestelldetails", daneben Bestellnummer in Martian Mono und eine kleine Statusmarkierung "Ausstehend". Links eine Liste der bestellten Bilder mit kleiner Vorschau, Dateiname, Format und Preis; rechts ein flaches Panel mit Kundendaten, Lieferadresse, Zwischensumme, Mehrwertsteuer und Gesamt in Martian Mono. Unten eine Fußleiste mit Textlink "Als erledigt markieren" und dunklem Knopf "Abschicken".
```

### BESTELLDETAILS — Mobil

```
Albumwerk – Bestelldetails (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · BESTELLDETAILS". Darunter: Kopfzeile mit Zurückpfeil, Fraunces-Überschrift "Bestelldetails", Bestellnummer in Martian Mono mit Statusmarkierung "Ausstehend". Dann gestapelt: vier Zeilen bestellter Bilder mit Vorschau, Dateiname und Preis, ein flaches Panel mit Kundendaten und Lieferadresse, darunter Zwischensumme, Mehrwertsteuer und Gesamt in Martian Mono. Unten eine feste Leiste mit dunklem Knopf "Abschicken".
```

### PROFIL — Desktop

```
Albumwerk – Profil (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · PROFIL". Darunter ein Einstellungsformular auf Barytpapier: Fraunces-Überschrift "Profil", zwei Gruppen mit feinen Trennlinien und kleinen Fraunces-Zwischenüberschriften — "Kontaktinformationen" mit Vorname, Nachname, E-Mail-Adresse, Telefon; "Adressinformationen" mit Straße, Hausnummer, Postleitzahl, Ort, Bundesland, Land. Unten eine Fußleiste mit Textlink "Abbrechen" und dunklem Knopf "Speichern".
```

### PROFIL — Mobil

```
Albumwerk – Profil (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · PROFIL". Darunter: Kopfzeile mit Menüsymbol, Fraunces-Überschrift "Profil", zwei Gruppen mit feinen Trennlinien — "Kontaktinformationen" mit Vorname, Nachname, E-Mail-Adresse, Telefon; "Adressinformationen" mit Straße, Hausnummer, Postleitzahl, Ort, Bundesland, Land. Unten eine feste Leiste mit dunklem Knopf "Speichern" und Textlink "Abbrechen".
```

### SUPPORT — Desktop

```
Albumwerk – Support (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · SUPPORT". Darunter auf Barytpapier: Fraunces-Überschrift "Support", links ein Formular "Anfrage senden" mit Feldern Betreff, Anliegen als mehrzeiliges Feld, einer Ankreuzzeile "Aufgetretenen Fehler anhängen" und dunklem Knopf "Anfrage senden". Rechts eine schmale Spalte "Alle Anfragen" mit vier flachen Einträgen aus Betreff, Datum in Martian Mono und kleiner Statusmarkierung "Offen" oder "Erledigt".
```

### SUPPORT — Mobil

```
Albumwerk – Support (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · SUPPORT". Darunter: Kopfzeile mit Menüsymbol, Fraunces-Überschrift "Support", Formular mit Betreff, mehrzeiligem Feld "Anliegen", Ankreuzzeile "Aufgetretenen Fehler anhängen", dunkler Knopf "Anfrage senden" über die volle Breite. Darunter feine Trennlinie und "Alle Anfragen" mit drei flachen Einträgen aus Betreff, Datum in Martian Mono und Statusmarkierung.
```

### TERMIN BUCHEN — Desktop

```
Albumwerk – Termin buchen (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · TERMIN BUCHEN". Darunter die öffentliche Buchungsseite eines Fotografen auf Barytpapier: Studioname als Wortmarke, Fraunces-Überschrift "Termin buchen", links die Auswahl der Leistung als drei flache Felder mit Name, Dauer und Preis in Martian Mono; in der Mitte ein schlichtes Monatsraster mit auswählbaren Tagen; rechts eine Spalte freier Uhrzeiten als schmale Knöpfe. Unten ein kurzes Formular mit Name, E-Mail, Telefon und dunklem Knopf "Verbindlich buchen". Footer mit Impressum und Datenschutz.
```

### TERMIN BUCHEN — Mobil

```
Albumwerk – Termin buchen (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · TERMIN BUCHEN". Darunter auf Barytpapier: Studioname als Wortmarke, Fraunces-Überschrift "Termin buchen", drei gestapelte flache Felder zur Auswahl der Leistung mit Dauer und Preis in Martian Mono, ein kompaktes Monatsraster, darunter freie Uhrzeiten als zweispaltiges Raster kleiner Knöpfe, dann Felder Name, E-Mail, Telefon und ein dunkler Knopf "Verbindlich buchen" über die volle Breite. Footer mit Impressum und Datenschutz.
```

### TERMIN VERWALTEN — Desktop

```
Albumwerk – Termin verwalten (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · TERMIN VERWALTEN". Darunter eine ruhige, mittig gesetzte Seite auf Barytpapier: kleine Kennzeichnung "Bestätigt" in Martian Mono, Fraunces-Überschrift "Dein Termin", darunter ein flaches Panel mit den Angaben als Definitionsliste — Leistung, Datum und Uhrzeit in Martian Mono, Dauer, Ort, Fotograf. Darunter zwei Knöpfe nebeneinander: "Termin verschieben" mit feiner Kontur und "Termin absagen" als Textlink in Rot. Unten Textlink "Neuen Termin buchen" und Footer mit Impressum und Datenschutz.
```

### TERMIN VERWALTEN — Mobil

```
Albumwerk – Termin verwalten (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · TERMIN VERWALTEN". Darunter auf Barytpapier: kleine Kennzeichnung "Bestätigt" in Martian Mono, Fraunces-Überschrift "Dein Termin", ein flaches Panel mit Leistung, Datum und Uhrzeit in Martian Mono, Dauer, Ort und Fotograf als Definitionsliste, darunter ein Knopf mit feiner Kontur "Termin verschieben", ein Textlink "Termin absagen" in Rot und ein Textlink "Neuen Termin buchen". Schmaler Footer.
```

### RECHTSTEXT — Desktop

```
Albumwerk – Rechtstext der App (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · RECHTSTEXT". Darunter auf Barytpapier eine einspaltige Lesespalte, höchstens 68 Zeichen breit: Dachzeile "Rechtliches" in Martian Mono, Fraunces-Überschrift "Impressum", darunter zwei schlichte Reiter "Impressum" und "Datenschutzerklärung", dann eine Definitionsliste mit Firma, Anschrift, Vertretungsberechtigtem, Kontakt und Umsatzsteuer-Identifikationsnummer in Martian Mono, danach Fließtext mit kleinen Zwischenüberschriften. Unten Textlink "Zurück zur Anmeldung".
```

### RECHTSTEXT — Mobil

```
Albumwerk – Rechtstext der App (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · RECHTSTEXT". Darunter auf Barytpapier: Kopfzeile mit Zurückpfeil, Dachzeile "Rechtliches" in Martian Mono, Fraunces-Überschrift "Impressum", zwei schlichte Reiter "Impressum" und "Datenschutzerklärung", eine Definitionsliste mit Firma, Anschrift, Kontakt und Umsatzsteuer-Identifikationsnummer in Martian Mono, danach Fließtext mit kleinen Zwischenüberschriften, unten Textlink "Zurück zur Anmeldung".
```

## Hilfe

### HILFE-ÜBERSICHT — Desktop

```
Albumwerk – Hilfe-Übersicht (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · HILFE-ÜBERSICHT". Darunter auf Barytpapier, mittig: Fraunces-Überschrift "Wie können wir helfen?", darunter ein breites Suchfeld mit Platzhalter "Wonach suchst du?" und die Zeile "12 Ergebnisse" in Martian Mono. Dann ein dreispaltiges Raster flacher Panels, je Panel eine Themengruppe mit Fraunces-Überschrift und drei Artikellinks darunter. Am Ende ein ruhiges Band mit dem Satz "Stell deine Frage direkt deinem Fotografen." und einem dunklen Knopf "Support kontaktieren".
```

### HILFE-ÜBERSICHT — Mobil

```
Albumwerk – Hilfe-Übersicht (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · HILFE-ÜBERSICHT". Darunter auf Barytpapier: Kopfzeile mit Zurückpfeil, Fraunces-Überschrift "Wie können wir helfen?", ein Suchfeld "Wonach suchst du?", die Zeile "12 Ergebnisse" in Martian Mono, dann drei gestapelte flache Panels mit je einer Themengruppe und drei Artikellinks. Unten ein Band mit "Stell deine Frage direkt deinem Fotografen." und dunklem Knopf "Support kontaktieren" über die volle Breite.
```

## Verwaltung

### ALBUM VERWALTEN — Desktop

```
Albumwerk – Album verwalten (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · ALBUM VERWALTEN". Darunter auf Barytpapier ein Verwaltungslayout: linke schmale Navigation, rechts der Inhalt. Kopf mit Fraunces-Titel "Hochzeit Lena & Tom", Rücklink "Alle Alben" und zwei Knöpfen "Bilder hochladen" und "Bearbeiten". Darunter vier schmale Kennzahlfelder, dann ein Raster aus Bildkacheln mit Auswahlhaken und Statuszeichen "Bezahlt". Rechts unten ein ruhiger Bereich mit rotem Textlink "Album löschen".
```

### ALBUM VERWALTEN — Mobil

```
Albumwerk – Album verwalten (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · ALBUM VERWALTEN". Darunter auf Barytpapier: Zurückpfeil "Alle Alben", Fraunces-Titel "Hochzeit Lena & Tom", zwei Kennzahlfelder nebeneinander, ein voller Knopf "Bilder hochladen" und ein heller Knopf "Bearbeiten". Dann ein zweispaltiges Raster aus Bildkacheln mit Auswahlhaken und Zeichen "Bezahlt". Ganz unten ein roter Textlink "Album löschen".
```

### BILDER & WASSERZEICHEN — Desktop

```
Albumwerk – Bilder & Wasserzeichen (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · BILDER & WASSERZEICHEN". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts ein zweispaltiger Inhalt: Fraunces-Titel "Wasserzeichen & Vorschau", links ein Formular mit Feldern "Wasserzeichen-Text" (Hinweis "Leer lassen, um den Geschäftsnamen zu verwenden"), Datei-Feld "Wasserzeichen-Logo (optional, statt Text)", Schieberegler "Deckkraft" und Zahlenfeld "Max. Vorschaugröße (px)". Rechts eine große Vorschaukachel mit diagonalem Wasserzeichen. Unten ein dunkler Knopf "Speichern" und ein heller "Vorschauen neu erzeugen".
```

### BILDER & WASSERZEICHEN — Mobil

```
Albumwerk – Bilder & Wasserzeichen (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · BILDER & WASSERZEICHEN". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Wasserzeichen & Vorschau", eine große Vorschaukachel mit diagonalem Wasserzeichen, darunter gestapelte Felder "Wasserzeichen-Text", Datei-Feld "Wasserzeichen-Logo", Schieberegler "Deckkraft" und Zahlenfeld "Max. Vorschaugröße (px)". Unten ein dunkler Knopf "Speichern" über die volle Breite und darunter ein heller Textknopf "Vorschauen neu erzeugen".
```

### PREISE — Desktop

```
Albumwerk – Preise (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · PREISE". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts der Inhalt: Fraunces-Titel "Alle Preise" und zwei Reiter "Einzelpreise" und "Alle Pakete". Darunter eine ruhige Tabelle mit Spalten Bezeichnung, Beschreibung, Format, Preis und einem Zeichen "Digitaler Download". Jede Zeile mit Stift- und Papierkorbsymbol. Oben rechts ein dunkler Knopf "Preis hinzufügen", darunter ein Hinweisband "Alle Standard-Pakete sind bereits vorhanden".
```

### PREISE — Mobil

```
Albumwerk – Preise (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · PREISE". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Alle Preise", zwei Reiter "Einzelpreise" und "Alle Pakete", dann gestapelte flache Karten statt Tabelle: je Karte Bezeichnung, kleine Beschreibung, Format, rechts der Preis in Martian Mono und darunter Stift- und Papierkorbsymbol. Unten ein dunkler Knopf "Preis hinzufügen" über die volle Breite.
```

### NUTZERVERWALTUNG — Desktop

```
Albumwerk – Nutzerverwaltung (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · NUTZERVERWALTUNG". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts der Inhalt: Fraunces-Titel "Nutzerverwaltung", darunter ein breites Suchfeld mit Platzhalter "Suche nach Name oder E-Mail…". Dann eine ruhige Tabelle mit Spalten Name, E-Mail, Status und Beitritt; im Status kleine Zeichen "Verifiziert" in Grün und "Nicht verifiziert" in Grau. Am Zeilenende ein Dreipunktmenü. Unter der Tabelle die Zeile "Keine Treffer" als leiser Hinweis.
```

### NUTZERVERWALTUNG — Mobil

```
Albumwerk – Nutzerverwaltung (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · NUTZERVERWALTUNG". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Nutzerverwaltung", Suchfeld "Suche nach Name oder E-Mail…", dann eine gestapelte Liste: je Zeile Namenskürzel im Kreis, Name, darunter die E-Mail in Martian Mono, rechts ein kleines Zeichen "Verifiziert" oder "Nicht verifiziert" und ein Dreipunktmenü. Am Ende der leise Hinweis "Noch keine Nutzer".
```

### SUPPORT-VERWALTUNG — Desktop

```
Albumwerk – Support-Verwaltung (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · SUPPORT-VERWALTUNG". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts ein zweispaltiger Inhalt: links die Liste "Alle Anfragen" mit Betreff, Absender und Zustandszeichen; rechts die geöffnete Anfrage mit Fraunces-Betreff, Verlauf in flachen Blöcken, einem Antwortfeld und zwei Knöpfen "Als erledigt markieren" und "An den Hersteller weiterleiten". Oben rechts ein leiser Hinweis "An den Hersteller weitergeleitet".
```

### SUPPORT-VERWALTUNG — Mobil

```
Albumwerk – Support-Verwaltung (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · SUPPORT-VERWALTUNG". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Alle Anfragen", zwei Filterreiter, dann eine gestapelte Liste flacher Karten mit Betreff, Absender, Datum in Martian Mono und Zustandszeichen. Eine Karte ist geöffnet und zeigt einen kurzen Verlauf, ein Antwortfeld und die Knöpfe "Als erledigt markieren" und "An den Hersteller weiterleiten" untereinander über die volle Breite.
```

### KONTAKT & GESCHÄFT — Desktop

```
Albumwerk – Kontakt & Geschäft (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · KONTAKT & GESCHÄFT". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts der Inhalt: Fraunces-Titel "Kontakt & Geschäft", dann zwei flache Panels untereinander. Panel eins "Kontakt & E-Mails" mit Feldern "Kontakt-E-Mail (Support)", "Bestell-Benachrichtigungen an" (Hinweis "Hier gehen neue Bestellungen ein") und "Website (optional)". Panel zwei mit Feld "Währung" und Hinweis "ISO-Code, z. B. EUR". Unten rechts ein dunkler Knopf "Speichern".
```

### KONTAKT & GESCHÄFT — Mobil

```
Albumwerk – Kontakt & Geschäft (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · KONTAKT & GESCHÄFT". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Kontakt & Geschäft", dann gestapelte Felder mit Beschriftungen "Kontakt-E-Mail (Support)", "Bestell-Benachrichtigungen an" mit Hinweis "Hier gehen neue Bestellungen ein", "Website (optional)" und "Währung" mit Hinweis "ISO-Code, z. B. EUR". Unten ein dunkler Knopf "Speichern" über die volle Breite.
```

### RECHTSTEXTE VERWALTEN — Desktop

```
Albumwerk – Rechtstexte verwalten (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · RECHTSTEXTE VERWALTEN". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts der Inhalt: Fraunces-Titel "Angaben zum Betrieb" mit Feldern "Firma, Anschrift", Umsatzsteuer-Nummer mit Platzhalter "DE123456789", "Hosting-Anbieter (für die Datenschutzerklärung)" und "E-Mail-Dienst / SMTP". Darunter zwei Reiter "Impressum" und "Datenschutzerklärung" über einem großen Textfeld, daneben die Knöpfe "Datenschutzerklärung erzeugen" und ein dunkler "Speichern". Oben ein leises Hinweisband "Impressum erzeugt — unten prüfen und speichern".
```

### RECHTSTEXTE VERWALTEN — Mobil

```
Albumwerk – Rechtstexte verwalten (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · RECHTSTEXTE VERWALTEN". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Angaben zum Betrieb", gestapelte Felder "Firma, Anschrift", "DE123456789", "Hosting-Anbieter" und "E-Mail-Dienst / SMTP". Darunter zwei Reiter "Impressum" und "Datenschutzerklärung" über einem hohen Textfeld, darunter ein heller Knopf "Datenschutzerklärung erzeugen" und ein dunkler Knopf "Speichern", beide über die volle Breite.
```

### EIGENE DOMAIN — Desktop

```
Albumwerk – Eigene Domain (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · EIGENE DOMAIN". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts der Inhalt: Fraunces-Titel "Eigene Domain", Einleitung "Eine eigene Domain richten wir für dich ein.", ein Feld für den Domainnamen mit hellem Knopf "Domain prüfen" und dunklem Knopf "Domain anfragen". Darunter ein flaches Panel mit einer kleinen Tabelle in Martian Mono: Typ "A-Record", Name, Wert "IP-Adresse deines Servers". Am Ende ein leiser Satz über das HTTPS-Zertifikat beim ersten Aufruf und ein grünes Hinweisband "Anfrage gesendet — wir melden uns mit den Details."
```

### EIGENE DOMAIN — Mobil

```
Albumwerk – Eigene Domain (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · EIGENE DOMAIN". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Eigene Domain", Satz "Eine eigene Domain richten wir für dich ein.", ein Domainfeld, darunter ein heller Knopf "Domain prüfen" und ein dunkler Knopf "Domain anfragen" über die volle Breite. Dann ein flaches Panel mit drei Zeilen in Martian Mono: "A-Record", Name, "IP-Adresse deines Servers". Unten ein grünes Hinweisband "Anfrage gesendet — wir melden uns mit den Details."
```

### EINBETTEN — Desktop

```
Albumwerk – Einbetten (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · EINBETTEN". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts der Inhalt: Fraunces-Titel "In deine Website einbetten", darunter ein dunkler Codeblock in Martian Mono mit einem Einbettungsschnipsel und rechts oben ein Knopf "Code kopieren" sowie das leise Wort "Kopiert". Darunter ein flaches Panel "Erlaubte Domains" mit Feld, Zeilenliste, Hinweis "Deine hinterlegte Website übernehmen?" und Knopf "Domains speichern". Am Ende ein gelbes Hinweisband "Die Terminbuchung ist noch nicht freigeschaltet."
```

### EINBETTEN — Mobil

```
Albumwerk – Einbetten (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · EINBETTEN". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "In deine Website einbetten", ein dunkler Codeblock in kleiner Martian Mono mit Zeilenumbruch, darunter ein dunkler Knopf "Code kopieren" über die volle Breite. Dann ein flaches Panel "Erlaubte Domains" mit Feld, zwei Listenzeilen und hellem Knopf "Domains speichern". Unten ein gelbes Hinweisband "Die Terminbuchung ist noch nicht freigeschaltet."
```

### HILFE-VERWALTUNG — Desktop

```
Albumwerk – Hilfe-Verwaltung (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · HILFE-VERWALTUNG". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts ein zweispaltiger Inhalt: links die Liste "Eigene Artikel" mit Titel, Themengruppe und Sichtbarkeitszeichen "Auch ohne Anmeldung" oder "Angemeldete Kunden"; rechts das Panel "Artikel bearbeiten" mit Titelfeld, Auswahlfeld "Bitte wählen", großem Textfeld und den Knöpfen "Abbrechen", "Speichern" sowie einem roten Textlink "Artikel löschen".
```

### HILFE-VERWALTUNG — Mobil

```
Albumwerk – Hilfe-Verwaltung (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · HILFE-VERWALTUNG". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Eigene Artikel", eine gestapelte Liste flacher Karten mit Artikeltitel, Themengruppe in Martian Mono, Zeichen "Auch ohne Anmeldung" und Stiftsymbol. Darunter das aufgeklappte Panel "Artikel bearbeiten" mit Titelfeld, Auswahlfeld "Bitte wählen", hohem Textfeld, dunklem Knopf "Speichern" über die volle Breite und rotem Textlink "Artikel löschen".
```

### TERMINARTEN — Desktop

```
Albumwerk – Terminarten (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · TERMINARTEN". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts ein zweispaltiger Inhalt: links die Liste der Leistungen, je Zeile Name, Dauer in Martian Mono, Preis und Zeichen "Buchbar" oder "Erst nach deiner Zusage verbindlich", dazu "Bearbeiten". Rechts ein flaches Panel mit Feldern "Dauer (Minuten)", "Abstand der Startzeiten (Minuten)", "Beschreibung (optional)" mit Hinweis "Ein bis zwei Sätze — erscheint im Buchungsformular.", einem Schalter "Buchbar" und den Knöpfen "Abbrechen" und "Speichern".
```

### TERMINARTEN — Mobil

```
Albumwerk – Terminarten (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · TERMINARTEN". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Terminarten", gestapelte flache Karten mit Leistungsname, Dauer und Preis in Martian Mono, Zeichen "Buchbar" und Link "Bearbeiten". Darunter das aufgeklappte Formular mit Feldern "Dauer (Minuten)", "Abstand der Startzeiten (Minuten)", "Beschreibung (optional)", einem Schalter "Buchbar" und einem dunklen Knopf "Speichern" über die volle Breite.
```

### VERFÜGBARKEIT — Desktop

```
Albumwerk – Verfügbarkeit (App, Desktop). Oben eine 24px hohe Leiste über die volle Breite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · DESKTOP · VERFÜGBARKEIT". Darunter auf Barytpapier links eine schmale Verwaltungsnavigation, rechts der Inhalt: Fraunces-Titel "Verfügbarkeit", ein Auswahlfeld "Alle Leistungen", darunter eine Wochentabelle von Montag bis Sonntag, je Zeile ein Schalter und zwei Uhrzeitfelder im Format HH:MM, dazu ein Pluszeichen für weitere Zeitfenster. Rechts ein flaches Panel mit Feldern "Buchbar bis wie viele Tage im Voraus", "Absagen möglich bis (Stunden vorher)", "Anfragen verfallen nach (Stunden)" und "Benachrichtigungen an". Unten ein dunkler Knopf "Speichern".
```

### VERFÜGBARKEIT — Mobil

```
Albumwerk – Verfügbarkeit (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · VERFÜGBARKEIT". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Verfügbarkeit", Auswahlfeld "Alle Leistungen", dann sieben gestapelte Zeilen Montag bis Sonntag mit Schalter und zwei Uhrzeitfeldern HH:MM. Darunter gestapelte Felder "Buchbar bis wie viele Tage im Voraus", "Absagen möglich bis (Stunden vorher)", "Anfragen verfallen nach (Stunden)" und "Benachrichtigungen an". Unten ein dunkler Knopf "Speichern" über die volle Breite.
```

## Nachzuholende Mobil-Varianten

### BRANDING — Mobil

```
Albumwerk – Branding (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · BRANDING". Darunter auf Barytpapier: Zurückpfeil, Fraunces-Titel "Auftritt & Branding", ein Feld "Geschäftsname", ein Feld für den Untertitel, ein Ablagefeld für das Logo mit kleiner Vorschau, eine Reihe runder Farbfelder zur Auswahl der Akzentfarbe und ein Auswahlfeld für die Schrift. Darunter eine flache Vorschaukachel, die den Auftritt zeigt. Unten ein dunkler Knopf "Speichern" über die volle Breite.
```

### EINRICHTUNG — Mobil

```
Albumwerk – Einrichtung (App, Mobil). Eine 390px breite Spalte mittig auf grauem Umfeld. Oben in der Spalte eine 24px hohe Leiste über die volle Spaltenbreite, Fläche #14130F, Text #E8E5DB, Martian Mono 0.625rem Versalien, Buchstabenabstand 0.08em, Inhalt "APP · MOBIL · EINRICHTUNG". Darunter auf Barytpapier: Fraunces-Titel "Erste Einrichtung", ein feiner Fortschrittsbalken mit der Zeile "Schritt 2 von 5" in Martian Mono, dann eine gestapelte Liste von Aufgaben, je Zeile ein Häkchen oder leerer Kreis, eine Aufgabe mit kurzem Satz und der Link "Jetzt erledigen". Erledigte Zeilen leicht gedämpft. Unten ein dunkler Knopf "Weiter" über die volle Breite und darunter ein leiser Textlink "Später erledigen".
```
