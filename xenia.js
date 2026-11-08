// Xbox 360-Spiele über den Emulator Xenia Canary (Open Source, BSD-3-Clause, github.com/xenia-canary).
// Läuft im Electron-Hauptprozess: Xenia herunterladen/finden, Spiele-Ordner durchsuchen, Cover holen, Spiele starten.
// PC360 lädt nur Xenia selbst – Spiele kommen ausschließlich aus dem Ordner, den der Nutzer auswählt.
const { app, dialog } = require("electron");
const { spawn, execFile } = require("child_process");
const { pathToFileURL } = require("url");
const crypto = require("crypto");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const TAR = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe"); // entpackt auch .zip
const RELEASES = "https://api.github.com/repos/xenia-canary/xenia-canary-releases/releases/latest";
const DOWNLOAD_PREFIX = "/xenia-canary/xenia-canary-releases/releases/download/";
const EXE_NAME = /^xenia(_canary)?\.exe$/i;

const dataDir = () => app.getPath("userData");
const CONFIG = () => path.join(dataDir(), "xenia.json");
const OWN_DIR = () => path.join(dataDir(), "xenia");         // hierhin lädt PC360 Xenia Canary
const COVERS = () => path.join(dataDir(), "x360covers");     // Cover-Zwischenspeicher

// ---------- Einstellungen (xenia.json) ----------
let config = null;
function cfg() {
  if (!config) {
    try { config = JSON.parse(fs.readFileSync(CONFIG(), "utf8")); } catch { config = {}; }
    if (typeof config !== "object" || !config) config = {};
    config.played = config.played && typeof config.played === "object" ? config.played : {};
    config.noCover = config.noCover && typeof config.noCover === "object" ? config.noCover : {};
  }
  return config;
}
function saveCfg() {
  try { fs.mkdirSync(dataDir(), { recursive: true }); fs.writeFileSync(CONFIG(), JSON.stringify(cfg(), null, 1)); } catch {}
}

// Mitgelieferte Xenia: beim Entwickeln PC360\xenia (oder so wie entpackt: PC360\xenia_canary_windows),
// im Build immer "xenia" neben PC360.exe (build/copy-xenia.js – aus app.asar heraus ließe sich keine exe starten)
const BUNDLED_NAMES = ["xenia", "xenia_canary_windows"];
const BUNDLED_DIR = () => {
  if (app.isPackaged) return path.join(path.dirname(process.execPath), "xenia");
  const dirs = BUNDLED_NAMES.map((n) => path.join(__dirname, n));
  return dirs.find((d) => fs.existsSync(d)) || dirs[0];
};
function findExeIn(dir) {
  const look = (d) => {
    try { return fs.readdirSync(d).filter((f) => EXE_NAME.test(f)).sort((a, b) => b.length - a.length).map((f) => path.join(d, f))[0] || null; } // xenia_canary.exe vor xenia.exe
    catch { return null; }
  };
  const direct = look(dir);
  if (direct) return direct;
  try { // auch ein Unterordner tiefer (z. B. entpacktes Zip mit eigenem Ordner)
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) { const p = look(path.join(dir, e.name)); if (p) return p; }
  } catch {}
  return null;
}

// Reihenfolge: selbst ausgewählt → von PC360 heruntergeladen (neuer) → mitgeliefert im Ordner "xenia"
function exePath() {
  const c = cfg();
  return [c.exe, path.join(OWN_DIR(), "xenia_canary.exe"), findExeIn(BUNDLED_DIR())]
    .find((p) => typeof p === "string" && EXE_NAME.test(path.basename(p)) && fs.existsSync(p)) || null;
}
const defaultGamesDir = () => path.join(app.getPath("documents"), "Xbox 360");
function gamesDir() {
  const c = cfg();
  if (typeof c.gamesDir === "string" && c.gamesDir) return c.gamesDir;
  return fs.existsSync(defaultGamesDir()) ? defaultGamesDir() : null;
}

function status() {
  const exe = exePath(), dir = gamesDir();
  return {
    exe: !!exe,
    exePath: exe,
    own: !!exe && path.dirname(exe) === OWN_DIR(),
    bundled: !!exe && path.dirname(exe).startsWith(BUNDLED_DIR()),
    version: cfg().version || null,
    gamesDir: dir,
    gamesDirMissing: !!dir && !fs.existsSync(dir),
    running: !!child,
  };
}

// ---------- Xenia herunterladen (neueste Canary-Version von GitHub) ----------
// GitHubs Download-Server antwortet manchmal kurz mit 5xx → bis zu dreimal versuchen
async function fetchOk(url, { timeout = 15000, ...opts } = {}) {
  let status = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000 * attempt));
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeout), headers: { "User-Agent": "PC360", ...(opts.headers || {}) } });
      if (res.ok) return res;
      status = res.status;
      if (status < 500) break;
    } catch { status = 0; }
  }
  throw new Error(status ? `GitHub antwortet nicht (${status}) – später nochmal versuchen` : "Keine Verbindung zu GitHub");
}
const run = (cmd, args) => new Promise((resolve, reject) =>
  execFile(cmd, args, { windowsHide: true, timeout: 120000 }, (err) => (err ? reject(err) : resolve())));

let installing = null;
function install() {
  if (child) throw new Error("Erst das laufende Spiel beenden");
  installing ||= (async () => {
    const rel = await (await fetchOk(RELEASES, { headers: { Accept: "application/vnd.github+json" } })).json();
    const asset = (Array.isArray(rel?.assets) ? rel.assets : []).find((a) => /windows.*\.zip$/i.test(String(a?.name)));
    if (!asset) throw new Error("Kein Windows-Download gefunden");
    // nur genau dieses Repository auf github.com
    const url = new URL(String(asset.browser_download_url));
    if (url.protocol !== "https:" || url.hostname !== "github.com" || !url.pathname.startsWith(DOWNLOAD_PREFIX)) throw new Error("Unerwartete Download-Adresse");
    const data = Buffer.from(await (await fetchOk(url.href, { timeout: 300000 })).arrayBuffer());
    if (data.length < 500000 || data.length > 300e6 || data.readUInt32LE(0) !== 0x04034b50) throw new Error("Download beschädigt – bitte nochmal versuchen");

    const tmp = path.join(dataDir(), "xenia-download");
    await fsp.rm(tmp, { recursive: true, force: true });
    const out = path.join(tmp, "files");
    await fsp.mkdir(out, { recursive: true });
    const zip = path.join(tmp, "xenia.zip");
    await fsp.writeFile(zip, data);
    try { await run(TAR, ["-xf", zip, "-C", out]); } catch { throw new Error("Entpacken fehlgeschlagen"); }
    // xenia_canary.exe liegt oben oder einen Ordner tiefer
    let src = out;
    if (!fs.existsSync(path.join(out, "xenia_canary.exe"))) {
      const sub = (await fsp.readdir(out, { withFileTypes: true })).find((e) => e.isDirectory() && fs.existsSync(path.join(out, e.name, "xenia_canary.exe")));
      if (!sub) throw new Error("xenia_canary.exe nicht im Download gefunden");
      src = path.join(out, sub.name);
    }
    // vorhandene Xenia-Einstellungen im Ordner bleiben erhalten, Programmdateien werden ersetzt
    await fsp.cp(src, OWN_DIR(), { recursive: true, force: true });
    await fsp.rm(tmp, { recursive: true, force: true });
    const c = cfg();
    c.version = String(rel.tag_name || "").slice(0, 40) || null;
    delete c.exe; // ab jetzt die eigene, aktuelle Version benutzen
    saveCfg();
    return status();
  })().finally(() => { installing = null; });
  return installing;
}

// ---------- Auswahl per Windows-Dialog (Maus/Tastatur) ----------
async function pickExe(win) {
  const r = await dialog.showOpenDialog(win, { title: "xenia_canary.exe auswählen", properties: ["openFile"], filters: [{ name: "Xenia", extensions: ["exe"] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  if (!EXE_NAME.test(path.basename(r.filePaths[0]))) throw new Error("Bitte xenia_canary.exe (oder xenia.exe) auswählen");
  cfg().exe = r.filePaths[0];
  saveCfg();
  return status();
}
async function pickFolder(win) {
  const r = await dialog.showOpenDialog(win, { title: "Ordner mit deinen Xbox 360-Spielen", defaultPath: gamesDir() || app.getPath("documents"), properties: ["openDirectory"] });
  if (r.canceled || !r.filePaths[0]) return null;
  cfg().gamesDir = r.filePaths[0];
  saveCfg();
  return status();
}

// ---------- Spieldateien erkennen ----------
// ISO (XDVDFS), entpackte Ordner mit default.xex, Games on Demand und Arcade-Spiele (STFS-Pakete), .zar (Xenia-Archiv)
const hex8 = (n) => n.toString(16).toUpperCase().padStart(8, "0");
const cleanName = (s) => s.replace(/\.(iso|zar|xex)$/i, "").replace(/[[(][^\])]*[\])]/g, " ").replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim();
const gameId = (p) => crypto.createHash("sha1").update(p.toLowerCase()).digest("hex").slice(0, 16);

async function readAt(fh, pos, len) {
  const buf = Buffer.alloc(len);
  const { bytesRead } = await fh.read(buf, 0, len, pos);
  return buf.subarray(0, bytesRead);
}
async function readHead(file, len) {
  const fh = await fsp.open(file, "r");
  try { return await readAt(fh, 0, len); } finally { await fh.close(); }
}

// XEX2-Kopf: optionale Kopfeinträge ab 24; 0x00040006 = Ausführungsinfo, Title-ID dort an Stelle 12
function xexTitleId(b) {
  if (b.length < 24 || b.toString("latin1", 0, 4) !== "XEX2") return null;
  const n = Math.min(b.readUInt32BE(20), 64);
  for (let i = 0; i < n && 32 + i * 8 <= b.length; i++) {
    if (b.readUInt32BE(24 + i * 8) !== 0x00040006) continue;
    const at = b.readUInt32BE(28 + i * 8);
    const tid = at + 16 <= b.length ? b.readUInt32BE(at + 12) : 0;
    return tid ? hex8(tid) : null;
  }
  return null;
}

// Xbox-360-ISO: Dateisystem XDVDFS beginnt je nach Abbild an einer dieser Stellen
const ISO_BASES = [0, 0xFD90000, 0x2080000, 0x18300000];
function findDirEntry(d, want) {
  const seen = new Set(), stack = [0];
  while (stack.length) {
    const off = stack.pop();
    if (seen.has(off) || off + 14 > d.length) continue;
    seen.add(off);
    const left = d.readUInt16LE(off), right = d.readUInt16LE(off + 2);
    if (left === 0xFFFF) continue; // Füllbytes
    const len = d[off + 13];
    if (d.toString("latin1", off + 14, off + 14 + len).toLowerCase() === want) return { sector: d.readUInt32LE(off + 4), size: d.readUInt32LE(off + 8) };
    if (left) stack.push(left * 4);
    if (right) stack.push(right * 4);
  }
  return null;
}
async function readIso(file) {
  const fh = await fsp.open(file, "r");
  try {
    for (const base of ISO_BASES) {
      const vd = await readAt(fh, base + 0x10000, 28);
      if (vd.length < 28 || vd.toString("latin1", 0, 20) !== "MICROSOFT*XBOX*MEDIA") continue;
      const rootSize = vd.readUInt32LE(24);
      if (!rootSize || rootSize > 1 << 20) return null;
      const entry = findDirEntry(await readAt(fh, base + vd.readUInt32LE(20) * 2048, rootSize), "default.xex");
      if (!entry) return null; // z. B. Spiel der ersten Xbox (default.xbe) – kann Xenia nicht
      return { tid: xexTitleId(await readAt(fh, base + entry.sector * 2048, Math.min(entry.size, 65536))) };
    }
    return null; // keine Xbox-360-ISO (z. B. Windows-Installationsmedium)
  } finally { await fh.close(); }
}

// STFS-Paket (CON/LIVE/PIRS): 0x344 Inhaltstyp, 0x360 Title-ID, 0x1691 Spielname (UTF-16BE), danach Vorschaubilder (PNG)
const STFS_TYPES = { 0x7000: "god", 0xD0000: "xbla" };
function utf16be(b, at, max) {
  let s = "";
  for (let i = at; i + 1 < at + max && i + 1 < b.length; i += 2) {
    const c = b.readUInt16BE(i);
    if (!c) break;
    s += String.fromCharCode(c);
  }
  return s.replace(/[\u0000-\u001f]/g, "").trim();
}
async function readStfs(file) {
  const b = await readHead(file, 0x971A);
  if (b.length < 0x1720 || !["CON ", "LIVE", "PIRS"].includes(b.toString("latin1", 0, 4))) return null;
  const kind = STFS_TYPES[b.readUInt32BE(0x344)];
  if (!kind) return null; // Spielstände, DLC, Designs … gehören nicht in "Meine Spiele"
  const tid = b.readUInt32BE(0x360);
  const name = utf16be(b, 0x1691, 0x80) || utf16be(b, 0x411, 0x80);
  const v2 = b.readUInt32BE(0x348) === 2, max = v2 ? 0x3D00 : 0x4000;
  const pick = (at, size) => (size > 8 && size <= max && at + size <= b.length ? b.subarray(at, at + size) : null);
  const thumb = pick(v2 ? 0x541A : 0x571A, b.readUInt32BE(0x1716)) || pick(0x171A, b.readUInt32BE(0x1712));
  const png = thumb && thumb.readUInt32BE(0) === 0x89504E47 ? Buffer.from(thumb) : null;
  return { kind, tid: tid ? hex8(tid) : null, name, thumb: png };
}

const MAX_DEPTH = 6, MAX_ENTRIES = 20000;
async function scan(root) {
  const found = [];
  let budget = MAX_ENTRIES;
  async function walk(dir, depth) {
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    budget -= entries.length;
    if (budget < 0) return;
    // entpacktes Spiel: Ordner mit default.xex → als Ganzes ein Spiel, nicht weiter hinein
    const xex = entries.find((e) => e.isFile() && e.name.toLowerCase() === "default.xex");
    if (xex) {
      const p = path.join(dir, xex.name);
      const tid = xexTitleId(await readHead(p, 65536).catch(() => Buffer.alloc(0)));
      found.push({ path: p, kind: "folder", tid, name: cleanName(path.basename(dir)) });
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // <hash>.data = Datenteile eines GOD-Spiels; $SystemUpdate u. Ä. überspringen
        if (depth < MAX_DEPTH && !/\.data$/i.test(e.name) && !e.name.startsWith("$")) await walk(p, depth + 1);
        continue;
      }
      if (!e.isFile()) continue;
      try {
        if (/\.iso$/i.test(e.name)) {
          const r = await readIso(p);
          if (r) found.push({ path: p, kind: "iso", tid: r.tid, name: cleanName(e.name) });
        } else if (/\.zar$/i.test(e.name)) {
          found.push({ path: p, kind: "zar", tid: null, name: cleanName(e.name) });
        } else if (/^[0-9A-F]{8,42}$/i.test(e.name)) { // STFS-Pakete heißen nach ihrer Prüfsumme
          const r = await readStfs(p);
          if (r) found.push({ path: p, ...r, name: r.name || cleanName(path.basename(path.resolve(p, "../../.."))) });
        }
      } catch {}
    }
  }
  await walk(root, 0);
  return found;
}

// ---------- Cover ----------
// Microsofts Bildserver hat die Hüllen aller 360-Spiele (nach Title-ID). Einmal laden, dann lokal speichern.
const coverUrl = (tid, lang) => `http://download.xbox.com/content/images/66acd000-77fe-1000-9115-d802${tid.toLowerCase()}/${lang}/boxartlg.jpg`;
async function fetchCover(tid) {
  const file = path.join(COVERS(), `${tid}.jpg`);
  if (fs.existsSync(file)) return pathToFileURL(file).href;
  const c = cfg();
  if (c.noCover[tid] > Date.now() - 14 * 86400e3) return null; // gibt es nicht – zwei Wochen nicht erneut fragen
  let missing = 0;
  for (const lang of ["1031", "1033"]) { // deutsch, sonst englisch
    try {
      const res = await fetch(coverUrl(tid, lang), { signal: AbortSignal.timeout(8000), redirect: "error" });
      if (res.status === 404 || res.status === 403) { missing++; continue; }
      if (!res.ok) continue;
      const b = Buffer.from(await res.arrayBuffer());
      if (b.length < 1000 || b.length > 5e6 || b[0] !== 0xFF || b[1] !== 0xD8) continue; // nur echte JPEG-Bilder
      await fsp.mkdir(COVERS(), { recursive: true });
      await fsp.writeFile(file, b);
      return pathToFileURL(file).href;
    } catch {} // offline o. Ä. → beim nächsten Einlesen nochmal
  }
  if (missing === 2) c.noCover[tid] = Date.now();
  return null;
}
async function thumbUrl(g) {
  if (!g.thumb) return null;
  const file = path.join(COVERS(), `${g.id}-icon.png`);
  try {
    await fsp.mkdir(COVERS(), { recursive: true });
    await fsp.writeFile(file, g.thumb);
    return pathToFileURL(file).href;
  } catch { return null; }
}

async function mapLimit(list, n, fn) {
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (next < list.length) { const i = next++; out[i] = await fn(list[i]); }
  }));
  return out;
}

// ---------- Bibliothek ----------
let known = new Map(); // id → Spiel (mit Pfad; der Pfad verlässt den Hauptprozess nie)
async function library() {
  const dir = gamesDir();
  const base = { exe: !!exePath(), gamesDir: dir, games: [] };
  if (!dir || !fs.existsSync(dir)) return base;
  const found = await scan(dir);
  const map = new Map();
  for (const g of found) { g.id = gameId(g.path); map.set(g.id, g); }
  known = map;
  const c = cfg();
  const games = await mapLimit([...map.values()], 4, async (g) => ({
    id: g.id,
    name: (g.name || "Xbox 360-Spiel").slice(0, 120),
    tid: g.tid,
    kind: g.kind,
    lastPlayed: Number(c.played[g.id]) || 0,
    cover: g.tid ? await fetchCover(g.tid) : null,  // Hülle im Hochformat
    header: await thumbUrl(g),                       // kleines Symbol aus dem Paket
  }));
  saveCfg();
  games.sort((a, b) => b.lastPlayed - a.lastPlayed || a.name.localeCompare(b.name));
  return { ...base, games };
}

// ---------- Starten ----------
let child = null;
function launch(id, getWin) {
  const g = known.get(String(id));
  if (!g) throw new Error("Spiel nicht gefunden – Spiele neu einlesen");
  if (!fs.existsSync(g.path)) throw new Error("Die Spieldatei fehlt – ist das Laufwerk angeschlossen?");
  const exe = exePath();
  if (!exe) throw new Error("Xenia ist nicht installiert");
  if (child) throw new Error("Es läuft bereits ein Xbox 360-Spiel");
  if (installing) throw new Error("Xenia wird gerade aktualisiert");
  const send = (s) => { const w = getWin(); if (w && !w.isDestroyed()) w.webContents.send("x360:state", s); };
  const proc = spawn(exe, ["--fullscreen=true", g.path], { cwd: path.dirname(exe), stdio: "ignore", windowsHide: false });
  child = proc;
  let done = false;
  const finish = (err) => {
    if (done) return;
    done = true;
    if (child === proc) child = null;
    send({ running: false, id: g.id, error: err ? "Xenia konnte nicht gestartet werden" : null });
    const w = getWin(); // zurück ins Dashboard wie auf der 360
    if (w && !w.isDestroyed()) { w.show(); w.focus(); }
  };
  proc.once("error", finish);
  proc.once("exit", () => finish());
  cfg().played[g.id] = Math.floor(Date.now() / 1000);
  saveCfg();
  send({ running: true, id: g.id });
  return true;
}
function stop() {
  if (child) child.kill();
  return true;
}

// ---------- IPC ----------
function register(ipcMain, isTrusted = () => true, getWin = () => null) {
  const handle = (name, fn) => ipcMain.handle(name, async (e, ...args) => {
    if (!isTrusted(e)) return { error: "Nicht erlaubt" };
    try { return { data: await fn(...args) }; } catch (err) { return { error: err.message || String(err) }; }
  });
  handle("x360:status", status);
  handle("x360:library", library);
  handle("x360:install", install);
  handle("x360:pickExe", () => pickExe(getWin()));
  handle("x360:pickFolder", () => pickFolder(getWin()));
  handle("x360:launch", (id) => launch(id, getWin));
  handle("x360:stop", stop);
}

app.on("will-quit", () => { if (child) child.kill(); });

module.exports = { register, _test: { xexTitleId, readIso, readStfs, scan, cleanName } };
