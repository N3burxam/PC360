// Systemfunktionen für PC360 (läuft im Electron-Hauptprozess):
// Systeminfo, Laufwerke, Netzwerk, Apps/Ordner öffnen, Ausschalten, Steam-Bibliothek.
const { app, shell, screen } = require("electron");
const { execFile, spawn } = require("child_process");
const { pathToFileURL } = require("url");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Windows-Programme immer mit festem Pfad aufrufen (nie über PATH/Arbeitsordner suchen lassen)
const SYS32 = path.join(process.env.SystemRoot || "C:\\Windows", "System32");
const REG = path.join(SYS32, "reg.exe");
const SHUTDOWN = path.join(SYS32, "shutdown.exe");

const run = (cmd, args) => new Promise((resolve) =>
  execFile(cmd, args, { windowsHide: true, timeout: 5000 }, (err, out) => resolve(err ? "" : String(out))));

// ---------- Systeminfo ----------
function info() {
  const build = Number(os.release().split(".")[2]) || 0;
  const ip = network()[0]?.ip || null;
  const d = screen.getPrimaryDisplay();
  return {
    os: `${build >= 22000 ? "Windows 11" : "Windows 10"} (Build ${build})`,
    cpu: os.cpus()[0]?.model.trim() || "Unbekannt",
    cores: os.cpus().length,
    ramTotal: os.totalmem(),
    ramFree: os.freemem(),
    host: os.hostname(),
    uptime: os.uptime(),
    ip,
    display: `${Math.round(d.size.width * d.scaleFactor)} × ${Math.round(d.size.height * d.scaleFactor)}`,
    version: app.getVersion(),
  };
}

function network() {
  return Object.entries(os.networkInterfaces())
    .map(([name, addrs]) => {
      const v4 = (addrs || []).find((a) => a.family === "IPv4" && !a.internal);
      return v4 && { name, ip: v4.address };
    })
    .filter(Boolean);
}

// asynchron und mit Zeitlimit, damit ein nicht erreichbares Netzlaufwerk nichts einfriert
async function drives() {
  const check = (letter) => Promise.race([
    fs.promises.statfs(`${letter}:\\`).then((s) => s.blocks > 0 ? { letter, total: s.blocks * s.bsize, free: s.bavail * s.bsize } : null),
    new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
  ]).catch(() => null); // Laufwerk existiert nicht oder ist leer
  return (await Promise.all([..."CDEFGHIJKLMNOPQRSTUVWXYZ"].map(check))).filter(Boolean);
}

// ---------- Apps, Webseiten, Ordner ----------
// Nur genau diese Adressen dürfen geöffnet werden. Besonders steam:// ist mächtig
// (z. B. Spiele mit beliebigen Startparametern), darum nur Big Picture und Shop-Seiten.
const ALLOWED_URLS = [
  /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[\w\-./?=&%#:+]*)?$/i,
  /^steam:\/\/open\/bigpicture$/,
  /^steam:\/\/openurl\/https:\/\/store\.steampowered\.com\/[\w\-/]*$/,
  /^spotify:(playlist:[A-Za-z0-9]{22})?$/,
  /^discord:\/\/$/,
];
const PROTOCOLS = ["steam", "spotify", "discord"];

async function hasProtocol(scheme) {
  if (!PROTOCOLS.includes(scheme)) return false;
  const out = await run(REG, ["query", `HKCR\\${scheme}`, "/v", "URL Protocol"]);
  return out.includes("URL Protocol");
}

// Öffnet eine Webseite oder App (z. B. steam://...). Fehlt die App, wird die Ersatzadresse genommen.
async function open(url, fallback) {
  url = String(url);
  if (!ALLOWED_URLS.some((re) => re.test(url))) throw new Error("Diese Adresse ist nicht erlaubt");
  const scheme = url.split(":")[0].toLowerCase();
  if (scheme !== "https" && !(await hasProtocol(scheme))) {
    if (fallback) return open(fallback);
    throw new Error(`${scheme[0].toUpperCase() + scheme.slice(1)} ist nicht installiert`);
  }
  await shell.openExternal(url);
  return true;
}

const FOLDERS = ["home", "downloads", "documents", "music", "pictures", "videos"];
async function folder(name) {
  if (!FOLDERS.includes(name)) throw new Error("Unbekannter Ordner");
  const err = await shell.openPath(app.getPath(name));
  if (err) throw new Error(err);
  return true;
}

// ---------- Ausschalten ----------
function power(action) {
  if (action === "quit") { setTimeout(() => app.quit(), 300); return true; }
  const args = { shutdown: ["/s", "/t", "0"], restart: ["/r", "/t", "0"] }[action];
  if (!args) throw new Error("Unbekannte Aktion");
  spawn(SHUTDOWN, args, { detached: true, windowsHide: true, stdio: "ignore" }).unref();
  return true;
}

// ---------- Steam ----------
async function steamRoot() {
  const out = await run(REG, ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"]);
  const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
  const candidates = [m && path.normalize(m[1].trim()), "C:\\Program Files (x86)\\Steam", "C:\\Program Files\\Steam"];
  return candidates.find((p) => p && fs.existsSync(path.join(p, "steamapps"))) || null;
}

const vdf = (text, key) => (text.match(new RegExp(`"${key}"\\s+"([^"]*)"`)) || [])[1];
// Werkzeuge und Laufzeitumgebungen gehören nicht in "Meine Spiele"
const NOT_A_GAME = /redistributable|proton|steam linux runtime|steamworks|steamvr|dedicated server|soundtrack|wallpaper engine|sdk\b/i;

function artwork(root, appid) {
  const dir = path.join(root, "appcache", "librarycache", appid);
  const find = (file) => {
    const direct = path.join(dir, file);
    if (fs.existsSync(direct)) return pathToFileURL(direct).href;
    try { // neuere Steam-Versionen legen manche Bilder in Unterordner
      for (const sub of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, sub.name, file);
        if (sub.isDirectory() && fs.existsSync(p)) return pathToFileURL(p).href;
      }
    } catch {}
    return null;
  };
  return {
    // ältere Steam-Versionen: header.jpg, neuere: <hash>/library_header.jpg; sonst Steams Bild-CDN
    header: find("header.jpg") || find("library_header.jpg") || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
    hero: find("library_hero.jpg"),
    cover: find("library_600x900.jpg") || find("library_capsule.jpg"),
  };
}

// Infos aus appcache/appinfo.vdf (binäres KeyValues-Format, v28/v29):
// common/controller_support = "full" | "partial" (fehlt bei Spielen ohne Controller), common/type = "Demo" bei Demos.
// Ergebnis: Map appid → { pad: "full" | "partial" | null, demo } – oder null, wenn die Datei nicht lesbar ist.
function appInfo(root, wanted) {
  let buf;
  try { buf = fs.readFileSync(path.join(root, "appcache", "appinfo.vdf")); } catch { return null; }
  try {
    const magic = buf.readUInt32LE(0);
    if (magic !== 0x07564428 && magic !== 0x07564429) return null;
    let pos = 8, end = buf.length, strings = null;
    if (magic === 0x07564429) { // v29: Schlüssel sind Nummern in eine Texttabelle am Dateiende
      const at = Number(buf.readBigInt64LE(8));
      if (at <= 16 || at + 4 > buf.length) return null;
      pos = 16; end = at;
      const n = buf.readUInt32LE(at);
      strings = [];
      for (let i = 0, p = at + 4; i < n && p < buf.length; i++) { const e = buf.indexOf(0, p); if (e < 0) break; strings.push(buf.toString("utf8", p, e)); p = e + 1; }
    }
    const result = new Map();
    while (pos + 8 <= end) {
      const appid = buf.readUInt32LE(pos);
      if (!appid) break;
      const next = pos + 8 + buf.readUInt32LE(pos + 4);
      if (next > end) break;
      if (wanted.has(String(appid))) result.set(String(appid), readAppInfo(buf, pos + 8 + 60, next, strings)); // 60 Byte Kopf je Eintrag
      pos = next;
    }
    return result;
  } catch { return null; }
}

function readAppInfo(buf, pos, end, strings) {
  const stack = [];
  let support = null, demo = false;
  const key = () => {
    if (strings) { const i = buf.readUInt32LE(pos); pos += 4; return strings[i]; }
    const e = buf.indexOf(0, pos); const s = buf.toString("utf8", pos, e); pos = e + 1; return s;
  };
  while (pos < end) {
    const type = buf[pos++];
    if (type === 8 || type === 11) { if (!stack.length) break; stack.pop(); continue; }
    const k = key();
    if (type === 0) { stack.push(k); continue; }
    if (type === 1) {
      const e = buf.indexOf(0, pos);
      if (e < 0 || e >= end) break;
      if (stack.length === 2 && stack[1] === "common" && k === "controller_support") support = buf.toString("utf8", pos, e);
      if (stack.length === 2 && stack[1] === "common" && k === "type") demo = buf.toString("utf8", pos, e).toLowerCase() === "demo";
      pos = e + 1;
    } else if (type === 2 || type === 3 || type === 4 || type === 6) {
      if (stack.length === 3 && stack[1] === "common" && stack[2] === "category") { // Store-Kategorien als Ersatz
        if (k === "category_28") support ||= "full";
        if (k === "category_18") support ||= "partial";
      }
      pos += 4;
    } else if (type === 7 || type === 10) pos += 8;
    else break; // unbekannter Typ → Rest überspringen
  }
  return { pad: support === "full" || support === "partial" ? support : null, demo };
}

async function steamLibrary() {
  const root = await steamRoot();
  if (!root) return { installed: false, games: [] };
  let libs = [root];
  try {
    const lf = fs.readFileSync(path.join(root, "steamapps", "libraryfolders.vdf"), "utf8");
    const found = [...lf.matchAll(/"path"\s+"([^"]+)"/g)].map((m) => m[1].replace(/\\\\/g, "\\"));
    if (found.length) libs = found;
  } catch {}

  const games = new Map();
  for (const lib of libs) {
    const dir = path.join(lib, "steamapps");
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => /^appmanifest_\d+\.acf$/.test(f)); } catch {}
    for (const f of files) {
      try {
        const t = fs.readFileSync(path.join(dir, f), "utf8");
        const appid = vdf(t, "appid"), name = vdf(t, "name");
        // appid wird für Pfade und URLs benutzt → nur Ziffern zulassen
        if (!/^\d+$/.test(appid || "") || !name || NOT_A_GAME.test(name) || games.has(appid)) continue;
        games.set(appid, { appid, name, lastPlayed: Number(vdf(t, "LastPlayed")) || 0, ...artwork(root, appid) });
      } catch {}
    }
  }
  // pad: "full" | "partial" | null; "unknown", wenn appinfo.vdf nicht lesbar ist (dann wird nichts ausgeblendet)
  // demo: Demo/Testversion (Typ in appinfo.vdf, sonst am Namen erkannt) – Karte zeigt dann den halben Controller
  const infos = appInfo(root, new Set(games.keys()));
  for (const g of games.values()) {
    const info = infos?.get(g.appid);
    g.pad = infos ? info?.pad ?? null : "unknown";
    g.demo = !!info?.demo || /\bdemo\b/i.test(g.name);
  }
  const list = [...games.values()].sort((a, b) => b.lastPlayed - a.lastPlayed || a.name.localeCompare(b.name));
  return { installed: true, games: list };
}

async function launchGame(appid) {
  if (!/^\d+$/.test(String(appid))) throw new Error("Ungültige Spiel-ID");
  await shell.openExternal(`steam://rungameid/${appid}`);
  return true;
}

// ---------- Bing-Bild des Tages (Hintergrund der bing-Seite) ----------
async function bingImage() {
  const cacheFile = path.join(app.getPath("userData"), "bing.json");
  try {
    const res = await fetch("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=de-DE");
    const img = (await res.json()).images[0];
    // Bildadresse muss wirklich auf www.bing.com zeigen (kein "@andere-seite.de"-Trick)
    const url = new URL(`${img.urlbase}_1920x1080.jpg`, "https://www.bing.com");
    if (!String(img.urlbase).startsWith("/") || url.origin !== "https://www.bing.com") throw new Error("Unerwartete Bildadresse");
    const data = { url: url.href, title: String(img.title || ""), copyright: String(img.copyright || "") };
    fs.writeFileSync(cacheFile, JSON.stringify(data));
    return data;
  } catch {
    try { return JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch { return null; } // offline: letztes Bild
  }
}

// ---------- Suche: Bing-Vorschläge und Steam-Shop (nur diese zwei festen Adressen) ----------
function searchTerm(term) {
  const t = String(term ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100);
  if (!t) throw new Error("Leere Suche");
  return t;
}
async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "Accept-Language": "de-DE" } });
  if (!res.ok) throw new Error(`Suche fehlgeschlagen (${res.status})`);
  return res.json();
}
async function searchSuggest(term) {
  const data = await getJson(`https://www.bing.com/osjson.aspx?market=de-DE&query=${encodeURIComponent(searchTerm(term))}`);
  return (Array.isArray(data?.[1]) ? data[1] : []).filter((s) => typeof s === "string" && s.trim()).map((s) => s.slice(0, 100)).slice(0, 8);
}
const STEAM_IMG = /^https:\/\/[a-z0-9.-]+\.steamstatic\.com\/[\w\-./]+\.jpg$/i;
async function searchSteam(term) {
  const data = await getJson(`https://store.steampowered.com/api/storesearch/?l=german&cc=DE&term=${encodeURIComponent(searchTerm(term))}`);
  return (Array.isArray(data?.items) ? data.items : []).filter((i) => i?.type === "app" && Number.isInteger(i.id)).slice(0, 24).map((i) => {
    const small = String(i.tiny_image || "").split("?")[0];
    const p = i.price;
    return {
      id: i.id,
      name: String(i.name || "").slice(0, 120),
      price: p && Number.isFinite(p.final) ? (p.final === 0 ? "Kostenlos" : `${(p.final / 100).toFixed(2).replace(".", ",")} €`) : "",
      header: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${i.id}/header.jpg`,
      small: STEAM_IMG.test(small) ? small : null, // Ersatz, falls es header.jpg unter dieser Adresse nicht gibt
    };
  });
}

// ---------- 3D-Avatar (Export von 360sona, nur lokal) ----------
const AVATAR_GLB = path.join(__dirname, "src", "assets", "avatar", "avatar.glb");
async function avatarModel() {
  try {
    const st = await fs.promises.stat(AVATAR_GLB);
    if (!st.isFile() || st.size > 60 * 1024 * 1024) return null;
    const buf = await fs.promises.readFile(AVATAR_GLB);
    return buf.toString("latin1", 0, 4) === "glTF" ? buf : null;
  } catch { return null; } // keine Datei → gezeichneter Avatar
}

// ---------- IPC-Anbindung ----------
// isTrusted(event): nur Aufrufe aus dem eigenen Hauptfenster werden ausgeführt
function register(ipcMain, isTrusted = () => true) {
  const handle = (name, fn) => ipcMain.handle(name, async (e, ...args) => {
    if (!isTrusted(e)) return { error: "Nicht erlaubt" };
    try { return { data: await fn(...args) }; } catch (err) { return { error: err.message || String(err) }; }
  });
  handle("sys:info", info);
  handle("sys:network", network);
  handle("sys:drives", drives);
  handle("sys:open", open);
  handle("sys:folder", folder);
  handle("sys:power", power);
  handle("sys:bingImage", bingImage);
  handle("steam:library", steamLibrary);
  handle("steam:launch", launchGame);
  handle("search:suggest", searchSuggest);
  handle("search:steam", searchSteam);
  handle("avatar:model", avatarModel);
}

module.exports = { register };
