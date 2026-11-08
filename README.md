# PC360

Vollbild-Dashboard im Metro-Stil für einen PC im Xbox-360-Gehäuse.
Phase 1: nur Optik + Navigation, keine Kachel macht schon etwas.

## Starten

Doppelklick auf **`PC360.lnk`** (startet `dist\PC360-win32-x64\PC360.exe`).

Für die Entwicklung:

```
npm install
npm start      # Vollbild/Kiosk, direkt aus dem Quellcode
npm run dev    # Fenster + DevTools
npm run build  # baut dist\PC360-win32-x64\PC360.exe neu (nach Änderungen nötig!)
```

Beenden: `Strg+Shift+Q` (oder Alt+F4).

## Steuerung

| Aktion          | Tastatur              | Controller          |
|-----------------|-----------------------|---------------------|
| Bewegen         | Pfeile / WASD         | D-Pad / linker Stick|
| Seite wechseln  | Q / E                 | LB / RB             |
| Auswählen       | Enter / Leertaste     | A                   |
| Zurück          | Esc / Backspace       | B                   |
| Guide           | G / Pos1              | Start / Back        |
| X / Y           | X / Y                 | X / Y               |
| Bing-Suche      | Y                     | Y                   |

Die echte Guide-Taste kommt unter Windows meist nicht bei Chromium an, deshalb öffnen Start/Back den Guide. In der Bing-Suche heißt Start „Suchen“.

## Ablauf

Beim allerersten Start: Ersteinrichtung im Xbox-360-Stil (Sprache, Region, Anzeige, Auto-Aus, Konsolensicherheit, Internet-Test, Xbox-Anmeldung). Die Xbox-LIVE-Schritte zeigen das echte Xbox-LIVE-Logo von damals (`src/assets/logos/xbox-live.png`, Wikimedia Commons, gemeinfrei). Erneut starten: settings → System → Ersteinrichtung.

Boot-Animation → Profilauswahl („anmelden“) → Dashboard. Im Guide führt „Profil wechseln“ zurück zur Profilauswahl.
Eigene Sounds können in `src/assets/sounds/` abgelegt werden (siehe README dort).

Die App-Logos in `src/assets/logos/` (Netflix 2014, YouTube 2013–2017, Twitch 2012–2019, Prime Video 2016–2022, Spotify 2013–2015, Discord 2015–2021, Steam) stammen von Wikimedia Commons, wurden bereinigt und teils für dunkle Kacheln umgefärbt. Es sind Marken der jeweiligen Firmen und kennzeichnen nur die Links. Eine Kachel bekommt ein Logo über `logo: "<dateiname>"` (siehe `BRAND` in `src/app.js`).

## Was funktioniert

- **Tabs mit eigenem Aufbau** wie auf der 360. Gemeinsam ist nur die grüne Spalte links:
  - **home:** wie 2013 (LOOPER-Screenshot)
  - **games:** großes Hochformat-Cover vom zuletzt gespielten Spiel, breite Hauptkachel, darunter ein Spiel und Steam
  - **tv & movies:** wie 2015, mit zwei Spalten (grün und Netflix/Prime/Twitch) und Trailer oben rechts
  - **music:** wie 2012, mit zwei hohen Reihen, Albumkachel, „Top 50“, dunkler „suchen“-Kachel und breiter Spotify-Kachel
  - **apps:** wie 2012, mit zwei hohen Reihen, großer Browser-Kachel und App-Raster
  - **Listen:** „Meine Apps“, „Meine Video-Apps“ und „Meine sozialen Apps“ öffnen Listen.
  - **Suchen:** „… suchen“ öffnet die Bing-Suche.
- **Steam:** „Meine Spiele“ (games, Guide) und „Zuletzt“ (home) zeigen die Steam-Bibliothek mit Covern, A startet das Spiel. Die große Home-Kachel ist das zuletzt gespielte Spiel. Steam-Kachel = Big Picture, Store-Kacheln öffnen den Steam-Shop.
- **bing:** Bing-Bild des Tages als Hintergrund, X = Fotonachweis.
- **Bing-Suche** wie auf der 360 (Suchleiste auf der bing-Seite, oder Y überall im Dashboard):
  - **Eingabe:** Ein großes Suchfeld und alle Buchstaben in einer Reihe.
    - Die Reihe läuft im Kreis, mit LB/RB springst du um 6 Buchstaben.
    - A tippt den gewählten Buchstaben, X ist Rückschritt, Y Leerzeichen, Start sucht.
    - Darunter: 123/abc, Leerzeichen, Rückschritt, Löschen, Suchen.
    - Mit einer echten Tastatur tippst du direkt, Enter sucht.
  - **Beim Tippen:** Echte Bing-Vorschläge und die ersten Treffer erscheinen sofort.
  - **Ergebnisse:** Die Filter „alle · meine spiele · spiele · apps · web“ wechselst du mit LB/RB.
    - Installierte Steam-Spiele starten mit A.
    - Spiele aus dem Steam-Shop öffnen die Shopseite.
    - Apps und Einstellungen von PC360 öffnen sich direkt.
    - Web-Treffer (Bing, Bilder, Videos, Nachrichten, YouTube, Wikipedia) öffnen sich im Browser.
  - **Zurück:** B geht zurück zur Tastatur, Y startet eine neue Suche. Der letzte Suchbegriff bleibt erhalten.
- **Apps:** Browser, YouTube, Netflix, Spotify, Discord (App, sonst Webseite), Ordner für Musik/Videos/Bilder/Dateien.
- **Einstellungen:** Systeminformationen, Speicher, Netzwerk (echte Daten), Design (Hintergründe), Controller testen, Vibration, verbundene Geräte.
- **Ausschalten:** PC herunterfahren, neu starten, PC360 beenden (Settings → Ausschalten oder Guide → Einstellungen).
- **3D-Avatar:** Social und Profilauswahl zeigen deinen echten Xbox-360-Avatar in 3D (Export von [360sona.com](https://360sona.com/), siehe [ANLEITUNG.md](ANLEITUNG.md)). Er steht wie auf der 360 herum, macht im Leerlauf zwischendurch etwas (Umschauen, Gähnen, Strecken …) und winkt, wenn du seine Kachel auswählst. Ohne Export steht dort eine graue Platzhalter-Figur; Freunde erscheinen als Platzhalter. Einen Avatar-Editor gibt es in PC360 nicht mehr – das Aussehen änderst du auf 360sona.
- **Spielerprofil bearbeiten** wie auf der 360 (Settings → Profil → „Profil bearbeiten“ oder „Spielerbild ändern“):
  - **Felder:** Spielerbild (Xbox-Konto oder Original), Gamertag, Gamerscore, Motto (max. 21 Zeichen wie damals), Spielerzone (Freizeit, Profi, Familie, Underground), Name, Ort und Biografie.
  - **Spielerkarte:** Rechts zeigt eine Spielerkarte sofort alle Änderungen. Gamertag und Gamerscore erscheinen überall (oben rechts, Social, Profilauswahl, Guide).
  - **Konto und eigene Werte:** Eigene Angaben überschreiben die Werte des Xbox-Kontos, „Zurücksetzen“ holt die Kontowerte zurück.
- **Bildschirmtastatur** für alle Texte, mit QWERTZ, Umschalt, Symbolen, Ziffernblock für den Gamerscore und Zeichenzähler:
  - **Controller:** A tippt, X ist Rückschritt, Y Leerzeichen, LB Umschalt, Start Fertig, B Abbrechen.
  - **Echte Tastatur:** Damit tippst du direkt.
- **Nostalgie-Werbung:** Das Dashboard ist so mit Werbung belegt wie die 360 von 2013 bis 2015. Es sind rund 60 Original-Werbebilder von xbox.com Deutschland mit den deutschen Slogans von damals.
  - **home:** Die linke Spalte bleibt funktional, alles andere ist Werbung oder Promo.
    - Die große Kachel wechselt zwischen dem zuletzt gespielten Spiel und Bannern.
    - Darunter stehen Xbox Live Gold und Xbox-360-Spiele.
    - Rechts stehen Angebote, Xbox One und „WERBUNG“.
    - Dazu kommt ein Halo-5-Hintergrund, wie die Film-Übernahmen damals (LOOPER).
  - **games, tv & movies, music:** Große Banner oder Filmwerbung und je eine „WERBUNG“-Kachel.
  - **Fokus:** Eine ausgewählte Kachel bleibt stehen.
  - **A-Taste:** Sie öffnet bei Spielen auf Steam die Shopseite, sonst kommt eine kurze Info von damals.
  - **Abschalten:** Settings → Einstellungen → Nostalgie-Werbung. Ohne Werbung stehen dort wieder die normalen Kacheln.
  - **Bilder und Quellen:** Sie liegen in `src/assets/ads/` (nur privat, siehe README dort).
- Alles andere zeigt „Kommt später“.

## Xbox-Konto

Auf der Profilauswahl „Profil herunterladen“ wählen → Microsoft-Anmeldefenster. Danach werden Gamertag, Gamerpic, Gamerscore und die Freundesliste (Social → Freunde, oder Guide → Freunde) geladen.

- Client-ID der Azure-App steht in `config.json`. Die App muss „persönliche Microsoft-Konten“ erlauben, die Plattform „Mobil- und Desktopanwendungen“ mit der Umleitungs-URI `https://login.microsoftonline.com/common/oauth2/nativeclient` haben und öffentliche Clientflows zulassen.
- Die Anmeldung wird verschlüsselt (Windows-DPAPI) in `%APPDATA%\pc360\xbox.json` gespeichert. Abmelden: Guide → „Abmelden“.
- Ohne Internet wird das zuletzt geladene Profil angezeigt.

## Struktur

- `main.js` – Electron-Fenster (Kiosk, randlos)
- `src/app.js` – Seiten/Kacheln (`PAGES`), Rendering, Navigation. Jede Kachel hat `action: null` – hier docken später die Funktionen an.
- `src/input.js` – Tastatur + Gamepad → Aktionen
- `src/avatar3d.js` – 3D-Avatar (three.js + GLTFLoader aus `src/vendor/`); Modell aus `src/assets/avatar/avatar.glb`, das `build/copy-avatar.js` aus `avatar-modell/` übernimmt; Animationen für Leerlauf/Winken oben in der Datei
- `src/setup.js` – Ersteinrichtung
- `src/profile.js` – „Spielerprofil bearbeiten“ (Spielerkarte); Profildaten/Helfer (`profile()`, `gamertag()`, `gamerscore()`, Spielerbild) in `src/app.js`
- `src/keyboard.js` – Bildschirmtastatur (`Keyboard.open({ title, value, max, multiline, numeric, onDone })`)
- `src/search.js` – Bing-Suche (Tastatur, Vorschläge, Ergebnisse); Bing-Vorschläge und Steam-Shop-Suche laufen im Hauptprozess (`system.js`, nur feste Adressen)
- `src/style.css` – Design
- `autostart/install-shell.ps1` – macht PC360 zur Windows-Shell (nur auf dem Xbox-PC!)

## Autostart auf dem Xbox-PC (später)

1. `npm run build` und den ganzen Ordner `dist\PC360-win32-x64` nach `C:\PC360\` kopieren (die EXE braucht die Dateien daneben).
2. Eigenen Windows-Benutzer anlegen, darin `autostart\install-shell.ps1 -ExePath "C:\PC360\PC360.exe"` ausführen.
3. Automatische Anmeldung über `netplwiz`.
4. Notausgang: Strg+Alt+Entf → Task-Manager → `explorer.exe`. Rückgängig: `install-shell.ps1 -Uninstall`.

Zum harmlosen Testen vorher: Verknüpfung zu `PC360.exe` in `shell:startup` legen.

## Sicherheit

- Electron aktuell halten (`npm view electron version`, dann `npm install -D electron@<version>`), sonst bleiben Chromium-Lücken offen.
- Hauptfenster: kann nicht wegnavigieren, keine Popups, keine `<webview>`, Content-Security-Policy, Sandbox.
- Hauptprozess-Funktionen (`system.js`, `xbox.js`) nehmen nur Aufrufe vom eigenen Hauptfenster an.
- `sys.open` öffnet nur Adressen aus einer festen Erlaubnisliste (`ALLOWED_URLS` in `system.js`) – neue Kacheln mit Links dort eintragen.
- Berechtigungen (Kamera, Mikrofon, Standort, Benachrichtigungen) werden immer abgelehnt.
- `npm run build` setzt danach automatisch Electron-Fuses (`build/fuses.js`): kein Node-Modus, kein Debugger, nur der eigene App-Code.
- Der Xbox-Refresh-Token liegt mit Windows-DPAPI verschlüsselt in `%APPDATA%\pc360\xbox.json` (lesbar nur für denselben Windows-Benutzer).
