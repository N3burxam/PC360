# Lizenzen und Danksagungen

PC360 ist ein privates Fan-Projekt und **nicht mit Microsoft oder Xbox verbunden**. „Xbox“, „Xbox 360“, „Xbox LIVE“ und die zugehörigen Logos sind Marken von Microsoft. Das Dashboard ist dem Metro-Dashboard der Xbox 360 (2012–2015) nachempfunden. Die Symbole sind selbst als SVG nachgezeichnet, Original-Grafiken der Konsole sind nicht enthalten.

## Software im Programm

| Was | Wofür | Lizenz |
|---|---|---|
| [Electron](https://www.electronjs.org/) 45 | App-Rahmen (Chromium + Node.js) | MIT |
| [@electron/packager](https://github.com/electron/packager) | Bauen der `PC360.exe` | BSD-2-Clause |
| [@electron/fuses](https://github.com/electron/fuses) | Härtung der gebauten App | MIT |
| [three.js](https://threejs.org/) 0.147 + GLTFLoader | 3D-Avatar (`src/vendor/`) | MIT, siehe `src/vendor/three-LICENSE.txt` |

## Nicht enthalten, aber von PC360 genutzt

- **[Xenia Canary](https://github.com/xenia-canary/xenia-canary)** (BSD-3-Clause): der Xbox-360-Emulator. PC360 lädt ihn auf Wunsch von GitHub oder nutzt eine vorhandene Kopie. Spiele werden nie heruntergeladen, nur eigene Sicherungen aus dem gewählten Ordner gestartet.
- **[360sona.com](https://360sona.com/)** von Ezra Kruger: Nachbau des Xbox-360-Avatar-Editors. Von dort kommt der 3D-Avatar als `.glb`-Export. Laut 360sona gehören die Avatar-Gegenstände, Animationen und Grafiken Microsoft, und ein Export ist nur für die eigene Nutzung gedacht. Er liegt deshalb nur lokal (`avatar-modell/`, `src/assets/avatar/`, beide in `.gitignore`). Siehe [ANLEITUNG.md](ANLEITUNG.md).

## Daten und Dienste

- **Microsoft / Xbox LIVE:** Anmeldung, Gamertag, Gamerpic, Gamerscore und Freunde (Xbox-Live-API). Außerdem Hüllenbilder der 360-Spiele von `download.xbox.com`, lokal zwischengespeichert.
- **Microsoft Bing:** Bild des Tages und Suchvorschläge.
- **Valve / Steam:** eigene Spielebibliothek (lokale Steam-Dateien), Shop-Suche und Spielbilder für die Nostalgie-Werbung. Die Bilder gehören den jeweiligen Spielefirmen und liegen nur lokal (`src/assets/ads/`, in `.gitignore`).
- **Spotify:** Wiedergabe und Bibliothek für Xbox Music (Spotify Web API).
- **Wikipedia:** Interpreten-Biografien in Xbox Music. Die Texte stehen unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), Quelle ist der jeweilige Wikipedia-Artikel.

## Grafiken und Töne

- **App-Logos** (`src/assets/logos/`): Netflix, YouTube, Twitch, Prime Video, Spotify, Discord und Steam von Wikimedia Commons, bereinigt und teils umgefärbt. Das Xbox-LIVE-Logo ist gemeinfrei. Alle sind Marken der jeweiligen Firmen und kennzeichnen nur die Links.
- **Original-Töne, Startvideo und Werbebilder von 2013–2015** (`src/assets/sounds/`, `startup.mp4`, `src/assets/ads/`) liegen nur lokal und werden nicht hochgeladen.

## Danke

- **Ezra Kruger** für [360sona](https://360sona.com/): Ohne den Nachbau des Avatar-Editors und den GLB-Export gäbe es den echten Avatar in PC360 nicht.
- **Das Xenia-Team** und die Canary-Entwickler für den Xbox-360-Emulator.
- **Die three.js-Autoren** für die 3D-Bibliothek.
- **[Arquivo.pt](https://arquivo.pt/)** und die **[Wayback Machine](https://web.archive.org/)** für das Archiv von xbox.com 2012–2015 (Vorlagen für Werbung, Texte und Farben).
- **Alle, die damals das 360-Dashboard aufgenommen und auf YouTube gestellt haben.** Ihre Videos waren die Vorlage für Maße, Farben und Symbole (Quellen in `.claude/skills/360-zeitreise/references/`).
- **Nachbau-Projekte wie [dashx360](https://github.com/ZivvoZ/dashx360) und [WinX360](https://github.com/thiagordsfx/WinX360)** für ihre Referenzbilder des Metro-Dashboards.
- **Microsoft und [Blink UX](https://blinkux.com/)** für das Metro-Dashboard der Xbox 360, das hier nachgebaut wird.
