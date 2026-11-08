// Spotify für Xbox Music (läuft im Electron-Hauptprozess).
// Anmeldung: OAuth2 mit PKCE (ohne Client Secret) in einem eigenen Fenster; die Weiterleitung auf
// http://127.0.0.1:8888/callback wird im Fenster abgefangen – es läuft kein Server.
// Abspielen: über Spotify Connect – PC360 steuert die Spotify-App (Premium nötig). Läuft keine,
// wird die Spotify-App auf diesem PC unsichtbar im Hintergrund gestartet.
const { BrowserWindow, app, safeStorage } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const AUTH = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPE = ["user-read-private", "user-library-read", "user-library-modify", "playlist-read-private", "playlist-read-collaborative",
  "user-top-read", "user-read-recently-played", "user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"].join(" ");

const storeFile = () => path.join(app.getPath("userData"), "spotify.json");
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function clientId() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).spotifyClientId || ""; } catch { return ""; }
}

// ---------- Speicher (Refresh-Token verschlüsselt über Windows-DPAPI) ----------
function readStore() { try { return JSON.parse(fs.readFileSync(storeFile(), "utf8")); } catch { return {}; } }
function writeStore(data) { fs.mkdirSync(path.dirname(storeFile()), { recursive: true }); fs.writeFileSync(storeFile(), JSON.stringify(data, null, 2)); }
function saveRefresh(token) {
  if (!safeStorage.isEncryptionAvailable()) return;
  writeStore({ ...readStore(), refresh: safeStorage.encryptString(token).toString("base64") });
}
function loadRefresh() {
  const { refresh } = readStore();
  if (!refresh || !safeStorage.isEncryptionAvailable()) return null;
  try { return safeStorage.decryptString(Buffer.from(refresh, "base64")); } catch { return null; }
}

// ---------- Anmeldung ----------
let loginWindow = null;
function interactiveLogin(parent) {
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  const url = `${AUTH}/authorize?` + new URLSearchParams({
    client_id: clientId(), response_type: "code", redirect_uri: REDIRECT, scope: SCOPE,
    code_challenge_method: "S256", code_challenge: challenge, state, show_dialog: "true",
  });
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      parent, modal: true, alwaysOnTop: true, width: 520, height: 760, autoHideMenuBar: true, title: "Mit Spotify verbinden",
      webPreferences: { partition: "spotifylogin", sandbox: true, contextIsolation: true, nodeIntegration: false, webviewTag: false },
    });
    loginWindow = win;
    let done = false;
    const finish = (u) => {
      done = true;
      const q = new URL(u).searchParams;
      setImmediate(() => win.destroy());
      if (q.get("error")) reject(new Error(q.get("error") === "access_denied" ? "Anmeldung abgelehnt" : q.get("error")));
      else if (q.get("state") !== state) reject(new Error("Ungültige Antwort von Spotify"));
      else resolve({ code: q.get("code"), verifier });
    };
    const onNav = (e, u) => {
      if (done) return;
      if (u.startsWith(REDIRECT)) { e.preventDefault(); finish(u); }
      else if (!u.startsWith("https://")) e.preventDefault(); // nur verschlüsselte Seiten
    };
    win.webContents.on("will-redirect", onNav);
    win.webContents.on("will-navigate", onNav);
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.on("closed", () => { loginWindow = null; if (!done) reject(new Error("Anmeldung abgebrochen")); });
    win.loadURL(url);
  });
}

let access = null, accessUntil = 0;
async function tokenRequest(params) {
  let res;
  try {
    res = await fetch(`${AUTH}/api/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId(), ...params }) });
  } catch { throw new Error("Keine Internetverbindung – Spotify nicht erreichbar"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "invalid_grant" && params.grant_type === "refresh_token") { logout(); throw new Error("Spotify-Anmeldung abgelaufen – bitte neu verbinden"); }
    throw new Error(data.error_description || data.error || "Spotify-Anmeldung fehlgeschlagen");
  }
  if (data.refresh_token) saveRefresh(data.refresh_token);
  access = data.access_token;
  accessUntil = Date.now() + (data.expires_in - 60) * 1000;
  return access;
}
async function token() {
  if (access && Date.now() < accessUntil) return access;
  const refresh = loadRefresh();
  if (!refresh) throw new Error("Nicht mit Spotify verbunden");
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
}

// ---------- Web API ----------
const REASONS = {
  NO_ACTIVE_DEVICE: "Kein Spotify-Gerät aktiv",
  PREMIUM_REQUIRED: "Dafür ist Spotify Premium nötig",
};
async function api(method, url, body, retry = true) {
  let res;
  try {
    res = await fetch(url.startsWith("http") ? url : API + url, {
      method, headers: { Authorization: `Bearer ${await token()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) { if (/verbunden|abgelaufen/.test(e.message)) throw e; throw new Error("Keine Internetverbindung – Spotify nicht erreichbar"); }
  if (res.status === 401 && retry) { access = null; return api(method, url, body, false); }
  if (res.status === 429 && retry) { await wait(Math.min(5, +res.headers.get("retry-after") || 1) * 1000); return api(method, url, body, false); }
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
  if (!res.ok) throw new Error(REASONS[data?.error?.reason] || data?.error?.message || `Spotify-Fehler ${res.status}`);
  return data;
}

// ---------- Daten für Xbox Music (vereinfacht) ----------
const img = (images, want = 300) => {
  const list = (images || []).filter((i) => i?.url);
  if (!list.length) return null;
  return (list.find((i) => (i.width || 0) >= want && (i.width || 0) <= want * 2.2) || list[0]).url;
};
const artistNames = (a) => (a || []).map((x) => x.name).join(", ");
const firstArtist = (a) => (a || []).find((x) => x?.id) || null;
const track = (t, album) => t && ({ t: t.name, d: Math.round((t.duration_ms || 0) / 1000), uri: t.uri, artist: artistNames(t.artists),
  artistId: firstArtist(t.artists)?.id || "", artistUri: firstArtist(t.artists)?.uri || "",
  album: (album || t.album)?.name || "", albumId: (album || t.album)?.id || "", img: img((album || t.album)?.images) });
const album = (a) => a && ({ id: a.id, uri: a.uri, title: a.name, artist: artistNames(a.artists),
  artistId: firstArtist(a.artists)?.id || "", artistUri: firstArtist(a.artists)?.uri || "", year: +(a.release_date || "").slice(0, 4) || "",
  genre: a.album_type === "single" ? "Single" : "Album", img: img(a.images), total: a.total_tracks,
  tracks: a.tracks?.items ? a.tracks.items.map((t) => track(t, a)) : null });

// Mehrere Seiten einer Liste holen. Spotify begrenzt seit 2026 bei neuen Apps viele Abfragen auf 10 Einträge
// ("Invalid limit") – dann automatisch mit 10er-Seiten weitermachen.
async function paged(pathQ, want, per = 50, key = null) {
  const out = [];
  let offset = 0;
  while (out.length < want) {
    const sep = pathQ.includes("?") ? "&" : "?";
    let d;
    try { d = await api("GET", `${pathQ}${sep}limit=${Math.min(per, want - out.length)}&offset=${offset}`); }
    catch (e) { if (/invalid limit/i.test(e.message) && per > 10) { per = 10; continue; } throw e; }
    const page = key ? d?.[key] : d;
    const items = page?.items || [];
    out.push(...items);
    offset += items.length;
    if (!items.length || !page?.next) break;
  }
  return out;
}

async function library() {
  const settle = async (p) => { try { return await p; } catch { return null; } };
  const me = await api("GET", "/me");
  const [saved, lists, fresh, topA, topT, recent, likedSongs] = await Promise.all([
    settle(api("GET", "/me/albums?limit=50")),
    settle(api("GET", "/me/playlists?limit=50")),
    settle(api("GET", `/browse/new-releases?limit=20&country=${me.country || "DE"}`)), // für neue Apps oft gesperrt (403)
    settle(api("GET", "/me/top/artists?limit=20&time_range=medium_term")),
    settle(api("GET", "/me/top/tracks?limit=30&time_range=short_term")),
    settle(api("GET", "/me/player/recently-played?limit=30")),
    settle(paged("/me/tracks", 100)),
  ]);
  // Ersatz für gesperrte Neuerscheinungen: Alben deiner meistgehörten und zuletzt gehörten Titel
  const topAlbums = [];
  for (const t of [...(topT?.items || []), ...(recent?.items || []).map((i) => i.track)]) {
    const a = t?.album;
    if (a?.id && a.album_type !== "compilation" && !topAlbums.some((x) => x.id === a.id)) topAlbums.push(album(a));
    if (topAlbums.length >= 12) break;
  }
  const releases = (fresh?.albums?.items || []).map(album).filter(Boolean);
  return {
    user: { name: me.display_name || me.id, img: img(me.images, 64), premium: me.product === "premium", country: me.country },
    albums: (saved?.items || []).map((i) => album(i.album)).filter(Boolean),
    // Spotify liefert die Titelzahl inzwischen unter "items" statt "tracks"
    playlists: (lists?.items || []).filter(Boolean).map((p) => ({ id: p.id, uri: p.uri, title: p.name, img: img(p.images),
      total: (p.items ?? p.tracks)?.total || 0, owner: p.owner?.display_name || "", mine: p.owner?.id === me.id || !!p.collaborative })),
    releases: releases.length ? releases : topAlbums,
    releasesKind: releases.length ? "new" : "top",
    artists: (topA?.items || []).map((a) => ({ id: a.id, uri: a.uri, name: a.name, img: img(a.images, 400), genre: (a.genres || [])[0] || "" })),
    topTracks: (topT?.items || []).map((t) => track(t)).filter(Boolean),
    recent: (recent?.items || []).map((i) => track(i.track)).filter(Boolean),
    liked: (likedSongs || []).map((i) => track(i.track)).filter((t) => t && t.uri),
  };
}
async function search(q) {
  const term = String(q || "").trim().slice(0, 100);
  if (!term) return { artists: [], albums: [], tracks: [] };
  const d = await api("GET", `/search?q=${encodeURIComponent(term)}&type=artist,album,track&limit=10&market=from_token`);
  return {
    artists: (d?.artists?.items || []).map((a) => ({ id: a.id, uri: a.uri, name: a.name, img: img(a.images, 300), genre: (a.genres || [])[0] || "" })),
    albums: (d?.albums?.items || []).filter(Boolean).map(album),
    tracks: (d?.tracks?.items || []).filter(Boolean).map((t) => track(t)),
  };
}
async function albumDetail(id) { return album(await api("GET", `/albums/${encodeURIComponent(id)}`)); }
// Playlist-Titel: neuer Endpunkt /items, der Eintrag heißt jetzt "item"
async function playlistTracks(id) {
  try {
    const items = await paged(`/playlists/${encodeURIComponent(id)}/items`, 200);
    return items.map((i) => i.item || i.track).filter((t) => t && t.type !== "episode").map((t) => track(t)).filter((t) => t && t.uri);
  } catch (e) {
    // Spotify gibt die Titel fremder Playlists an neue Apps nicht mehr heraus – abspielen geht trotzdem
    if (/forbidden/i.test(e.message)) throw new Error("LOCKED");
    throw e;
  }
}

// ---------- Interpret: Bild, Alben, beliebte Titel, Biografie ----------
async function artistPage(id) {
  const settle = async (p) => { try { return await p; } catch { return null; } };
  const a = await api("GET", `/artists/${encodeURIComponent(id)}`);
  const [albums, hits, bio] = await Promise.all([
    settle(paged(`/artists/${encodeURIComponent(id)}/albums?include_groups=album,single`, 30, 10)),
    // "Top-Titel" ist für neue Apps gesperrt → Titel des Interpreten über die Suche
    settle(Promise.all([0, 10].map((o) => api("GET", `/search?q=${encodeURIComponent(`artist:"${a.name}"`)}&type=track&limit=10&offset=${o}&market=from_token`)))),
    settle(wikiBio(a.name)),
  ]);
  const seen = new Set();
  const fresh = (t) => t?.uri && !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase());
  const songs = (hits || []).flatMap((d) => d?.tracks?.items || [])
    .filter((t) => t?.artists?.some((x) => x.id === id) && fresh(t))
    .map((t) => track(t)).slice(0, 15);
  const list = (albums || []).map(album).filter(Boolean).sort((x, y) => (+y.year || 0) - (+x.year || 0));
  // kurzer Name (z. B. "Yu") → die Suche findet fremde Titel; dann Titel aus den neuesten Alben nehmen
  for (const al of list.slice(0, 3)) {
    if (songs.length >= 10) break;
    const d = await settle(api("GET", `/albums/${encodeURIComponent(al.id)}`));
    for (const t of d?.tracks?.items || []) if (songs.length < 15 && fresh(t)) songs.push(track(t, d));
  }
  return { id: a.id, uri: a.uri, name: a.name, img: img(a.images, 1000), thumb: img(a.images, 300), albums: list, songs, bio };
}

// Biografie aus Wikipedia (Spotify liefert keine). Eine Abfrage pro Sprache (Suche + Einleitungen zusammen),
// übernommen wird nur ein Artikel mit genau dem Namen, der wirklich von Musik handelt.
const bios = new Map();
const WIKI = [
  ["de", /\b(Band|Musiker|Musikerin|Sänger|Sängerin|Rapper|Rapperin|DJ|Produzent|Produzentin|Komponist|Komponistin|Duo|Musikgruppe|Gruppe|Liedermacher|Musikprojekt|Songwriter)/],
  ["en", /\b(band|musician|singer|rapper|DJ|producer|composer|duo|group|songwriter|musical project)/i],
];
async function wget(url, retry = true) {
  const res = await fetch(url, { headers: { "User-Agent": "PC360/0.4 (privates Xbox-Dashboard; Wikipedia-Biografien)" } });
  if (res.status === 429 && retry) { await wait(Math.min(4, +res.headers.get("retry-after") || 2) * 1000); return wget(url, false); }
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
}
const cleanBio = (t) => (t || "").split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 60 || /[.!?…]$/.test(l)).join("\n\n").trim();
async function wikiBio(name) {
  const key = name.toLowerCase();
  if (bios.has(key)) return bios.get(key);
  const norm = (x) => x.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
  let found = null, failed = false;
  for (const [lang, rx] of WIKI) {
    const base = `https://${lang}.wikipedia.org/w/api.php?format=json&formatversion=2&action=query`;
    let s;
    try { s = await wget(`${base}&generator=search&gsrlimit=8&gsrsearch=${encodeURIComponent(name)}&prop=extracts&exintro=1&explaintext=1&exlimit=8&redirects=1`); }
    catch { failed = true; continue; }
    const page = (s?.query?.pages || []).sort((x, y) => x.index - y.index).find((p) => !p.title.includes("/") && norm(p.title) === norm(name)
      && rx.test((p.extract || "").slice(0, 500)) && !/steht für:|bezeichnet:|may refer to:/i.test((p.extract || "").slice(0, 300)));
    if (!page) continue;
    let text = cleanBio(page.extract);
    // kurze Einleitung → etwas mehr vom Artikel holen (für "Mehr anzeigen")
    if (text.length < 900) {
      const e = await wget(`${base}&prop=extracts&explaintext=1&exsectionformat=plain&exchars=3000&titles=${encodeURIComponent(page.title)}`).catch(() => null);
      const more = cleanBio(e?.query?.pages?.[0]?.extract);
      if (more.length > text.length) text = more;
    }
    found = { text: text.replace(/\s*…$/, " …"), source: `Wikipedia (${lang})` };
    break;
  }
  if (found || !failed) bios.set(key, found); // bei Netzfehlern nicht dauerhaft "keine Bio" merken
  return found;
}

// ---------- Abspielen (Spotify Connect) ----------
const spotifyExe = () => path.join(process.env.APPDATA || "", "Spotify", "Spotify.exe");
let preferred = null; // zuletzt benutztes Gerät
async function device(getWin) {
  let { devices } = (await api("GET", "/me/player/devices")) || { devices: [] };
  const pick = () => devices.find((d) => d.is_active) || devices.find((d) => d.id === preferred) || devices.find((d) => d.type === "Computer") || devices[0];
  if (!devices.length && fs.existsSync(spotifyExe())) {
    // Spotify-App auf diesem PC unsichtbar starten und warten, bis sie sich bei Spotify Connect meldet
    spawn(spotifyExe(), ["--autostart", "--minimized"], { detached: true, stdio: "ignore" }).unref();
    for (let i = 0; i < 16 && !devices.length; i++) {
      await wait(750);
      devices = ((await api("GET", "/me/player/devices")) || {}).devices || [];
    }
    const w = getWin(); if (w && !w.isDestroyed()) { w.focus(); w.moveTop(); }
  }
  const d = pick();
  if (!d) throw new Error("Spotify läuft auf keinem Gerät – öffne Spotify auf dem PC oder Handy");
  preferred = d.id;
  return d;
}
async function play(getWin, opts = {}) {
  const d = await device(getWin);
  if (typeof opts.shuffle === "boolean") await api("PUT", `/me/player/shuffle?state=${opts.shuffle}&device_id=${d.id}`).catch(() => {});
  const body = opts.context ? { context_uri: opts.context, ...(opts.offset != null ? { offset: { position: opts.offset } } : {}) }
    : opts.uris ? { uris: opts.uris.slice(0, 100), ...(opts.offset != null ? { offset: { position: opts.offset } } : {}) } : undefined;
  await api("PUT", `/me/player/play?device_id=${d.id}`, body);
  return { device: d.name };
}
async function player() {
  const s = await api("GET", "/me/player?additional_types=track");
  if (!s || !s.item) return { active: !!s, playing: false, track: null, next: [] };
  const q = await api("GET", "/me/player/queue").catch(() => null);
  return {
    active: true, playing: !!s.is_playing, shuffle: !!s.shuffle_state, pos: Math.round((s.progress_ms || 0) / 1000),
    device: s.device?.name || "", track: track(s.item), context: s.context?.uri || null,
    next: (q?.queue || []).slice(0, 6).map((t) => track(t)).filter(Boolean),
  };
}
async function control(cmd, arg) {
  if (cmd === "pause") return api("PUT", "/me/player/pause");
  if (cmd === "resume") { const d = await device(() => null); return api("PUT", `/me/player/play?device_id=${d.id}`); }
  if (cmd === "next") return api("POST", "/me/player/next");
  if (cmd === "previous") return api("POST", "/me/player/previous");
  if (cmd === "shuffle") return api("PUT", `/me/player/shuffle?state=${!!arg}`);
  if (cmd === "seek") return api("PUT", `/me/player/seek?position_ms=${Math.max(0, Math.round(+arg || 0) * 1000)}`);
  if (cmd === "save") return api("PUT", `/me/albums?ids=${encodeURIComponent(arg)}`);
  throw new Error("Unbekannter Befehl");
}

function logout() { access = null; accessUntil = 0; try { fs.unlinkSync(storeFile()); } catch {} }

// ---------- IPC ----------
function register(ipcMain, isTrusted, getWin) {
  const handle = (name, fn) => ipcMain.handle(`spotify:${name}`, async (e, ...args) => {
    if (!isTrusted(e)) return { error: "Nicht erlaubt" };
    try { return { data: await fn(...args) }; } catch (err) { return { error: err.message || String(err) }; }
  });
  handle("status", async () => ({ configured: !!clientId(), signedIn: !!loadRefresh() }));
  handle("login", async () => {
    if (!clientId()) throw new Error("Keine Spotify Client ID in config.json");
    if (loginWindow) { loginWindow.focus(); throw new Error("Anmeldung läuft bereits"); }
    const { code, verifier } = await interactiveLogin(getWin());
    await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, code_verifier: verifier });
    return { signedIn: true };
  });
  handle("logout", async () => { logout(); return { signedIn: false }; });
  handle("library", () => library());
  handle("album", (id) => albumDetail(String(id)));
  handle("search", (q) => search(q));
  handle("playlist", (id) => playlistTracks(String(id)));
  handle("artist", (id) => artistPage(String(id)));
  handle("player", () => player());
  handle("play", (opts) => play(getWin, {
    context: typeof opts?.context === "string" && /^spotify:[a-z]+:[A-Za-z0-9]+$/.test(opts.context) ? opts.context : undefined,
    uris: Array.isArray(opts?.uris) ? opts.uris.filter((u) => typeof u === "string" && /^spotify:track:[A-Za-z0-9]+$/.test(u)) : undefined,
    offset: Number.isInteger(opts?.offset) && opts.offset >= 0 ? opts.offset : undefined,
    shuffle: typeof opts?.shuffle === "boolean" ? opts.shuffle : undefined,
  }));
  handle("control", (cmd, arg) => control(String(cmd), arg));
}

module.exports = { register };
