# PC360 – Changelog

Jede Änderung zählt +1 auf der letzten Stelle (0.0.9 → 0.1.0 → … → 0.3.9).

## 0.5.2
- 3D-Avatar ist dein echter Xbox-360-Avatar: Export von 360sona.com (.glb) aus PC360\avatar-modell wird beim Start/Build übernommen (nur lokal, nicht in Git – die Gegenstände gehören Microsoft, Export nur für eigene Nutzung)
- social: Avatar steht wie auf der 360 da ("Just... standing around"), macht im Leerlauf zwischendurch etwas (Umschauen, Gähnen, Strecken, Bling check …) und winkt ("Hello there!"), wenn du die Kachel auswählst
- Beleuchtet wie auf dem Dashboard; ohne Export bleibt der gezeichnete Avatar; der PC360-Avatar-Editor ändert weiter den gezeichneten Avatar (Aussehen in 3D kommt aus 360sona)
- three.js 0.147 mit GLB-Lader (lokal, MIT)

## 0.5.1.1
- Selbst gebauter 3D-Avatar wieder abgeschaltet (sah zu eckig aus) – social und Editor zeigen den gezeichneten Avatar; der 3D-Avatar kommt zurück mit einem fertigen CC0-Modell (Quaternius Universal Base Characters)

## 0.5.1
- 3D-Avatar (erster Wurf): der eigene Avatar auf social und in der großen Vorschau des Avatar-Editors ist jetzt dreidimensional (three.js, lokal) – im Stil der 360-Avatare nach den Bildern des echten Avatars: großer Kopf, Cap mit Tarnmuster und Schirm, eckige Brille, Xbox-Trikot (vorne XBOX, hinten 8, grüne Ärmel mit orangefarbenen Bündchen), weite Jeans, Sneaker; atmet, verlagert das Gewicht, schaut sich um und blinzelt
- Alle Editor-Einstellungen wirken auch in 3D (Größe, Figur, Hautfarbe, Augen, Brauen, Mund, Bart, 10 Frisuren, Oberteil, Hose, Schuhe, Brille, Kopfbedeckung); Freunde und kleine Vorschaubilder bleiben gezeichnet; ohne WebGL bleibt alles beim bisherigen Avatar
- Standard-Schuhe dunkelgrün (wie beim echten Avatar)

## 0.5.0
- settings wie auf der echten 360 (verglichen mit Aufnahmen 2013–2015): neue Symbole wie im Original (stehende Xbox 360 S, Polaroid-Profil, Punkteliste, Erwachsener mit Kind), etwas größer; Controller-Kachel mit Controller statt Kinect-Symbol; gesperrte Kacheln mit kaum sichtbarem Symbol und Text
- Design: die vier eingebauten Designs der 360 statt ausgedachter Farben – Xbox 360, Spectrum (Rot-Orange mit Ringen), Tag (heller Lichtstreifen), Nacht (dunkel, warmes Licht); bisheriges "Dunkel" wird zu Nacht
- System → Konsoleneinstellungen öffnet jetzt eine Liste wie damals: Anzeige, Audio, Sprache und Gebietsschema, Uhr (aktuell), Starten und Herunterfahren, Konsolenname, Systeminformationen

## 0.4.9
- Nostalgie-Werbung wie auf der echten 360 (verglichen mit Aufnahmen des Dashboards 2013/2014): sauberes Spielbild statt xbox.com-Webgrafiken (keine Slogans, Plaketten, Konsolenkartons mehr), Beschriftung immer im dunklen Balken in einer Zeile ("Auf Xbox One", "Arcade: Bastion", "Skyrim herunterladen"), große Kachel ohne Webbanner; Inhalte von damals: Arcade-Klassiker, Games on Demand, Telltale-Episoden, Xbox-One-Hinweise; nur unten rechts bezahlte Werbung mit "WERBUNG" linksbündig darunter; Hintergrund auf home: Mordors Schatten
- tv & movies: große Kachel ohne Werbung (es gibt keine sauberen Filmbilder von damals)

## 0.4.8.2
- Meine Spiele: Demos und Testversionen zeigen wie auf der 360 den halben Controller (rechte Hälfte gestrichelt), installierte Spiele den Controller mit ▶; fehlt die Hülle, steht das Symbol groß auf der grauen Fläche (Steam-Demos werden aus appinfo.vdf erkannt)

## 0.4.8.1
- Meine Spiele wie auf der echten 360 (2015, belegt per Original-Aufnahme): unten links die Plattform im Stil von "⊕ Xbox One" (Xbox 360 mit Ring of Light bzw. PC), unten rechts das Statussymbol Controller mit ▶ (auf der Konsole, sofort spielbar)
- Xenia aus dem Ordner `xenia_canary_windows` wird erkannt (so wie entpackt); Einstellung "Xbox 360-Spiele" steht jetzt hinter Spotify
- Neuer Projekt-Skill "360-zeitreise": Original-Oberfläche im Web recherchieren, Bilder auswerten, Befunde mit Quelle festhalten und PC360 daran anpassen

## 0.4.8
- Xbox 360-Spiele mit dem Emulator Xenia Canary (Open Source): Einstellungen → Xbox 360-Spiele → Xenia herunterladen (GitHub), selbst auswählen oder in den Ordner `xenia` legen (wird beim Build neben PC360.exe kopiert); Spiele-Ordner auswählen (Unterordner werden durchsucht)
- Erkennt ISO-Abbilder, entpackte Spiele (default.xex), Games on Demand und Arcade-Spiele; Name und Title-ID aus den Dateien, echte Hüllen von Microsofts Bildserver (lokal zwischengespeichert)
- Xbox 360-Spiele erscheinen in "Meine Spiele", in der Suche und auf den Weiterspielen-Kacheln; während ein Spiel läuft, reagiert das Dashboard nicht auf den Controller, nach dem Beenden geht es zurück ins Dashboard
- Meine Spiele: oben (↑) "anzeigen" (alle / Steam / Xbox 360), "controller" (nur mit / auch ohne) und "sortieren" (zuletzt gespielt / A bis Z), Auswahl wird gemerkt; standardmäßig nur Spiele mit Controller-Unterstützung (aus Steams appinfo.vdf)
- Karten zeigen unten rechts eine kleine Xbox 360 (mit Ring of Light) für 360-Spiele, den PC für Steam-Spiele; PC-Symbol ohne Pixelfehler

## 0.4.7.3
- Sicherheits- und Bug-Check (Red-Ring-Check): Spotify-Anmeldefenster und Browser-Sitzung lehnen Kamera, Mikrofon, Benachrichtigungen usw. jetzt von Anfang an ab; Browser-Cursor bleibt auch über Cookie-Bannern/Dialogen sichtbar, selbst wenn er stillsteht; veraltete Tests repariert und zu echten Prüfungen gemacht

## 0.4.7.2
- Browser: Controller und Cursor frieren nicht mehr ein, sobald Leiste und Tastenhinweise ausblenden (die Oberfläche galt dann als verborgen)

## 0.4.7.1
- Browser: im Vollbild (Video, Bild) bleibt der Cursor sichtbar und steuerbar, B beendet das Vollbild

## 0.4.7
- Xbox Live beitreten (lokales Profil) wie auf der 360: social → An-/Abmelden (oder Profil herunterladen) führt durch Willkommen, Profil auswählen, Vorname (Xbox-Tastatur), Geburtsdatum, Informationen bestätigen, Kontakteinstellungen, Nutzungsbedingungen, Microsoft-Konto (echte Anmeldung im Microsoft-Fenster), Konto wird verbunden und Herzlichen Glückwunsch – danach ist dein echtes Xbox-Profil verbunden
- Social: neben dem Avatar "XBOX LIVE – Geh online …" für das lokale Profil bzw. "Xbox macht mit Freunden mehr Spaß", wenn kein Freund online ist

## 0.4.6
- Xbox Music: Interpret-Seite wie im Video – großes Bild mit "Alle abspielen" und "Songliste anzeigen", daneben "bio" (Biografie aus Wikipedia, "Mehr anzeigen"), "Smart DJ abspielen", "alben" (neuestes groß + Liste, "Alle Alben anzeigen") und "beliebte songs"
- Xbox Music: Playlist-Fenster wie im Video (Titel mit "Album von Interpret", Anzahl und Dauer, Abspielen, Zufallswiedergabe) statt sofort abzuspielen
- Spotify-Fehler behoben (Spotify hat 2026 seine Schnittstelle für neue Apps eingeschränkt): Playlists zeigten "0 Titel", "Invalid limit" bei Interpreten, Playlist-Titel ließen sich nicht laden (neuer Endpunkt); fremde Playlists zeigen einen Hinweis, abspielen geht trotzdem
- Xbox Music: "Songs" zeigt deine Lieblingssongs von Spotify; "Interpret erkunden" im Album-Fenster öffnet die Interpret-Seite

## 0.4.5.1
- Xbox Music: Playlists in der Such-Seitenleiste (ohne Suchbegriff alle, beim Tippen passende; A spielt ab)

## 0.4.5
- Xbox Music: Suche mit der eigenen Xbox-Tastatur (eingebettet unten), Suchleiste klappt beim Tippen nicht mehr ein, Suchleiste in Xbox-Grün

## 0.4.4
- Xbox Music: Suche wie im Original – lila Seitenleiste rechts (Y) mit Eingabefeld, Vorschlägen und Treffern mit Bild, Windows-Bildschirmtastatur unten, Ergebnisseite mit Filtern (Spotify-Suche); echtes Xbox-Logo

## 0.4.3
- Xbox Music: Album-Fenster und Listen flackern beim Blättern nicht mehr; music-Seite im Dashboard zeigt Spotify-Inhalte (laufender Titel bzw. Top-Album, erste Playlist, Smart DJ statt Radio); "deine top-alben" statt der für neue Apps gesperrten Neuerscheinungen

## 0.4.2
- Spotify-Anbindung für Xbox Music: Anmeldung (PKCE, ohne Client Secret), deine Alben, Playlists, Top-Interpreten, zuletzt gehört, Neuerscheinungen; Abspielen, Pause, Weiter, Zufall und "als nächstes" über Spotify Connect (Spotify-App startet bei Bedarf unsichtbar im Hintergrund); Spotify verbinden/trennen auch in Einstellungen

## 0.4.1
- Xbox Music nach dem Original-Video umgebaut: Panorama (meine musik · aktuelle wiedergabe · alle musik · top-musik) auf grauem Verlauf, helles Album-Fenster, dunkle Listenansicht mit Navigation, Aktuelle Wiedergabe mit Bild, grünem Dreieck und "als nächstes"

## 0.4.0
- Xbox Music: eigene Musik-App im 360-Stil (start · sammlung · entdecken · radio · playlists, Albumansicht, Aktuelle Wiedergabe, Mini-Player) – vorerst mit Beispieldaten, Spotify folgt

## 0.3.9
- Versionsnummer und dieser Changelog

## 0.3.8
- Pivot-Schrift: aktiver Eintrag wieder dünn, dafür mit leichtem Leuchten

## 0.3.7
- Web Hub: Fehler behoben, durch den man in Favoriten/Verlauf hinten hängen blieb und nicht mehr nach vorn kam

## 0.3.6
- Web Hub: echte Seiten-Logos auf den Karten, sonst groß der Name

## 0.3.5
- Browser wie im Original-Video: Tropfen-Cursor (grau, über Klickbarem grün), Cursor auch in Tastatur und Web Hub, Leiste blendet beim Surfen aus, Fußleiste, abgedunkelte Seite im Hintergrund, große Fehlerseite

## 0.3.4
- Bewegung: Kacheln gleiten gestaffelt herein, weicher Übergang vom Startup zur Profilauswahl

## 0.3.3
- Ausschalten als Meldungsfenster im „Xbox Home“-Stil

## 0.3.2
- Profilauswahl nach „sign in or out“ (2015)

## 0.3.1
- „Meine Spiele“ als Reihe weißer Cover-Karten

## 0.3.0
- Einstellungslisten mit grauem Infofeld rechts

## 0.2.9
- Xbox Guide nach echter Aufnahme (Größe, Farben, zwei Leisten rechts)

## 0.2.8
- Settings-Seite: 4 × 2 quadratische Kacheln in Original-Reihenfolge

## 0.2.7
- Social-Seite: 4 flache Kacheln, Gamertag, Gamerscore, zuletzt gespielte Spiele, Avatar

## 0.2.6
- Grundlook 1:1: gemessener Hintergrund, Kachelgrün #009600, Fokus mit Vergrößerung und Schatten, Pivot, Tastenfarben, Gamertag ⇄ Statuszeile oben rechts

## 0.2.5
- Bildschirmtastatur im Xbox-360-Stil (Links/Symbole/Umschalt, Rechts/Akzente/Fertig)

## 0.2.4
- Browser: Web Hub blieb beim Öffnen einer Seite liegen – behoben

## 0.2.3
- Eingebauter Internet Explorer (Chromium) statt Standardbrowser, mit Leiste, Tastatur und Web Hub

## 0.2.2
- Startup-Video wurde nicht gefunden – behoben

## 0.2.1
- Xbox-360-Startup als Video

## 0.2.0
- Xbox-360-Startup als Animation

## 0.1.9
- Echtes Xbox-LIVE-Logo in der Ersteinrichtung

## 0.1.8
- Profil bearbeiten (Gamertag, Gamerscore, Motto, Bio, Spielerbild …)

## 0.1.7
- Alle Werbungen geprüft: nichts abgeschnitten, kein doppelter Text

## 0.1.6
- Eigene Layouts je Tab (tv 2015, music/apps 2012, games mit Hochformat-Cover)

## 0.1.5
- Bing-Suche mit Controller, echten Vorschlägen und Ergebnissen

## 0.1.4
- Werbung über das ganze Dashboard verteilt, Hintergrund-Übernahme, abschaltbar

## 0.1.3
- Nostalgie-Werbekachel

## 0.1.2
- Avatar-Editor

## 0.1.1
- Original-Logos auf den App-Kacheln

## 0.1.0
- Sicherheits-Update: Electron 45, gesperrte Navigation, CSP, Fuses

## 0.0.9
- Bing-Seite mit Bild des Tages, Tabs nach dem Metro-Redesign 2012–2015

## 0.0.8
- Design an echte Screenshots angeglichen (Guide-Tabs, Social-Avatare, Listen)

## 0.0.7
- Steam-Bibliothek: Spiele starten, Cover

## 0.0.6
- Systemfunktionen: Systeminfo, Laufwerke, Netzwerk, Apps öffnen, Ausschalten

## 0.0.5
- EXE-Build mit eigenem Symbol

## 0.0.4
- Startproblem behoben (ComSpec)

## 0.0.3
- Xbox-Login und Freundesliste

## 0.0.2
- Autostart-Skript für den Xbox-PC

## 0.0.1
- Grundgerüst: Vollbild-Dashboard mit Pivots, Kacheln, Guide, Boot-Intro, Controller-Steuerung
