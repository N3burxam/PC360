const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const xbox = require("./xbox");

const isDev = process.argv.includes("--dev");
const APP_URL = pathToFileURL(path.join(__dirname, "src", "index.html")).href;
let mainWin;

// Nur eine PC360-Instanz gleichzeitig (sonst zwei Vollbildfenster)
if (!app.requestSingleInstanceLock()) app.exit(0);
app.on("second-instance", () => {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.focus();
});

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1920,
    height: 1080,
    backgroundColor: "#000000",
    frame: false,
    kiosk: !isDev,
    fullscreen: !isDev,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      // Wenn der Browser das ganze Fenster bedeckt (Leisten ausgeblendet), gilt die Oberfläche sonst als "verborgen":
      // dann stoppt requestAnimationFrame und der Controller liefert keine Daten mehr → alles wirkt eingefroren
      backgroundThrottling: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWin.setMenu(null);
  mainWin.loadFile(path.join(__dirname, "src", "index.html"));
  mainWin.once("ready-to-show", () => mainWin.show());

  // Die Oberfläche darf nie woanders hin navigieren oder neue Fenster öffnen –
  // eine fremde Seite hätte sonst Zugriff auf die PC360-Funktionen (Ausschalten, Apps starten …).
  mainWin.webContents.on("will-navigate", (e, url) => { if (url !== APP_URL) e.preventDefault(); });
  mainWin.webContents.on("will-redirect", (e) => e.preventDefault());
  mainWin.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Notausgang Strg+Shift+Q – nur wenn PC360 im Vordergrund ist (nicht systemweit)
  mainWin.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.control && input.shift && input.key.toLowerCase() === "q") {
      e.preventDefault();
      app.quit();
    }
  });

  if (isDev) mainWin.webContents.openDevTools({ mode: "detach" });
}

// Nur das eigene Hauptfenster darf die Funktionen im Hauptprozess aufrufen
const isTrusted = (e) => e.sender === mainWin?.webContents && e.senderFrame?.url === APP_URL;

// Fehler als { error } zurückgeben, damit die Oberfläche eine saubere Meldung bekommt
const handle = (name, fn) => ipcMain.handle(name, async (e) => {
  if (!isTrusted(e)) return { error: "Nicht erlaubt" };
  try { return { data: await fn() }; } catch (err) { return { error: err.message || String(err) }; }
});
handle("xbox:status", () => xbox.status());
handle("xbox:login", () => xbox.login(mainWin));
handle("xbox:refresh", () => xbox.refresh());
handle("xbox:logout", () => xbox.logout());
require("./system").register(ipcMain, isTrusted); // Systeminfo, Apps öffnen, Ausschalten, Steam
require("./web").register(ipcMain, isTrusted, () => mainWin); // eingebauter Browser (web.js)
require("./spotify").register(ipcMain, isTrusted, () => mainWin); // Spotify für Xbox Music (spotify.js)
require("./xenia").register(ipcMain, isTrusted, () => mainWin); // Xbox 360-Spiele mit Xenia (xenia.js)

app.whenReady().then(() => {
  // Berechtigungen (Kamera, Mikrofon, Standort, Benachrichtigungen …) grundsätzlich ablehnen,
  // auch für die Anmeldeseiten von Microsoft und Spotify und – schon vor dem ersten Öffnen – für den Browser
  // (Electron würde sonst alles erlauben; web.js erlaubt dort später nur Vollbild)
  for (const ses of [session.defaultSession, session.fromPartition("mslogin"), session.fromPartition("spotifylogin"), session.fromPartition(require("./web").PARTITION)]) {
    ses.setPermissionRequestHandler((_wc, _perm, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);
  }
  // Keine eingebetteten <webview>-Elemente und keine fremden Fenster aus irgendeinem Inhalt
  app.on("web-contents-created", (_e, contents) => {
    contents.on("will-attach-webview", (ev) => ev.preventDefault());
  });
  createWindow();
});

app.on("window-all-closed", () => app.quit());
