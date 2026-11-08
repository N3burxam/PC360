# PC360 – Anleitung

So richtest du PC360 ein und holst deinen eigenen Xbox-360-Avatar ins Dashboard.

## 1. Starten

- **PC360 starten:** Doppelklick auf `PC360.lnk`.
- **Beenden:** `Strg+Shift+Q`.
- **Nach Änderungen am Code:** `npm run build` baut die App neu.

Beim ersten Start führt dich die Ersteinrichtung im Stil der 360 durch Sprache, Anzeige und Xbox-Anmeldung.

## 2. Deinen Avatar holen (360sona)

PC360 hat keinen eigenen Avatar-Editor. Dein Avatar kommt von **[360sona.com](https://360sona.com/)**, einem Nachbau des Xbox-360-Avatar-Editors im Browser. Dort kannst du deinen echten Avatar von deinem Xbox-Konto laden oder einen neuen bauen.

### a) Avatar auf 360sona öffnen

1. Öffne [360sona.com](https://360sona.com/) im Browser.
2. Lege ein Konto an (nur Name und Passwort).
   **Schreib dir die Wiederherstellungswörter auf.** Es gibt keinen Passwort-Reset.
3. Wähle eine der beiden Möglichkeiten:
   - **Echten Avatar laden:** Verknüpfe dein Microsoft-Konto und wähle **„Read my Xbox avatar“**.
   - **Neu bauen:** Stelle den Avatar im Editor zusammen.

### b) Als 3D-Modell exportieren

Öffne **„Export a 3D model“** und stelle Folgendes ein:

| Option | Einstellung |
|---|---|
| For | Any viewer (Blender geht auch) |
| File | **.glb** |
| Parts | One object per item |
| Pose | As shown |
| Bones | **Humanoid names** |
| Props | In the hand |
| Accessories | **Keep on** (sonst fehlen Cap, Brille usw.) |
| Look | Lit by the viewer *oder* As 360sona shades it |
| Textures | **Embed as PNG** ✔ |
| Animations | **Select all** |

Dann klickst du auf **Export**. Du bekommst eine `.glb`-Datei, etwa 5–6 MB groß.

> Bei „As 360sona shades it“ ist die Rückseite der Figur sehr hell. Auf dem Dashboard fällt das kaum auf, weil der Avatar meist nach vorn schaut.

### c) Datei in PC360 legen

1. Kopiere die `.glb` in den Ordner **`PC360\avatar-modell\`**. Der Dateiname ist egal.
2. Starte PC360 neu. Hast du die App aus dem Quellcode gebaut, führe vorher `npm run build` aus.

Liegen mehrere Dateien im Ordner, nimmt PC360 die **neueste**. Um den Avatar zu ändern, exportierst du ihn auf 360sona neu und legst die Datei dazu.

### d) Was der Avatar in PC360 macht

- Er steht auf der Seite **social** und in der **Profilauswahl** und läuft im Leerlauf in seiner Grundhaltung („Just… standing around“).
- Alle paar Sekunden spielt er zwischendurch eine andere Animation ab: umschauen, gähnen, strecken, „Bling check“ usw.
- Wählst du seine Kachel aus, **winkt** er („Hello there!“).

Ohne Datei steht dort eine graue Platzhalter-Figur.

### Wichtig: nur für dich

Laut 360sona gehören die Avatar-Gegenstände, Animationen und Grafiken **Microsoft**. Ein Export ist **nur für die eigene Nutzung** gedacht. Deshalb gilt:

- **Nicht in Git:** `avatar-modell/` und `src/assets/avatar/` stehen in `.gitignore`.
- **Nicht weitergeben:** Teile die Datei nicht und lade sie nirgends hoch.

## 3. Weitere Einrichtung (optional)

| Was | Wo |
|---|---|
| Xbox-Konto (Gamertag, Freunde, Gamerscore) | Profilauswahl → „Profil herunterladen“ |
| Spotify für Xbox Music | settings → Einstellungen → Spotify |
| Xbox-360-Spiele (Xenia) | settings → Einstellungen → Xbox 360-Spiele: Xenia laden oder auswählen, Spiele-Ordner wählen. Nur eigene Sicherungen deiner Spiele verwenden |
| Design (Xbox 360, Spectrum, Tag, Nacht) | settings → Einstellungen → Design |
| Nostalgie-Werbung an/aus | settings → Einstellungen → Nostalgie-Werbung |
| Profil, Gamertag, Spielerbild | settings → Profil oder social → „Profil bearbeiten“ |

## 4. Steuerung

| Aktion | Tastatur | Controller |
|---|---|---|
| Bewegen | Pfeile / WASD | D-Pad / linker Stick |
| Seite wechseln | Q / E | LB / RB |
| Auswählen | Enter / Leertaste | A |
| Zurück | Esc / Backspace | B |
| Guide | G / Pos1 | Start / Back |
| Suchen | Y | Y |
