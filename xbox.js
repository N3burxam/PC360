// Xbox-Live-Anmeldung über ein Microsoft-Konto (läuft im Electron-Hauptprozess).
// Ablauf: Microsoft-Login (OAuth2 + PKCE) → Xbox-User-Token → XSTS-Token → Xbox-APIs.
const { BrowserWindow, app, safeStorage } = require("electron");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const AUTHORITY = "https://login.microsoftonline.com/consumers/oauth2/v2.0";
const REDIRECT = "https://login.microsoftonline.com/common/oauth2/nativeclient";
const SCOPE = "XboxLive.signin offline_access";

// fetch mit verständlicher Meldung, wenn keine Verbindung besteht
async function net(url, opts) {
  try { return await fetch(url, opts); }
  catch { throw new Error("Keine Internetverbindung – Xbox-Daten konnten nicht geladen werden"); }
}

const storeFile = () => path.join(app.getPath("userData"), "xbox.json");
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function clientId() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).clientId || "";
  } catch { return ""; }
}

// ---------- Speicher (Refresh-Token verschlüsselt über Windows-DPAPI) ----------
function readStore() {
  try { return JSON.parse(fs.readFileSync(storeFile(), "utf8")); } catch { return {}; }
}
function writeStore(data) {
  fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
  fs.writeFileSync(storeFile(), JSON.stringify(data, null, 2));
}
function saveRefreshToken(token) {
  const store = readStore();
  if (safeStorage.isEncryptionAvailable()) store.refresh = safeStorage.encryptString(token).toString("base64");
  writeStore(store);
}
function loadRefreshToken() {
  const { refresh } = readStore();
  if (!refresh || !safeStorage.isEncryptionAvailable()) return null;
  try { return safeStorage.decryptString(Buffer.from(refresh, "base64")); } catch { return null; }
}
function saveProfile(profile) { writeStore({ ...readStore(), profile }); }

// ---------- Microsoft-Login ----------
function interactiveLogin(parent) {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  const url = `${AUTHORITY}/authorize?` + new URLSearchParams({
    client_id: clientId(), response_type: "code", redirect_uri: REDIRECT, scope: SCOPE,
    code_challenge: challenge, code_challenge_method: "S256", state, prompt: "select_account",
  });

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      parent, modal: true, alwaysOnTop: true, width: 520, height: 720,
      autoHideMenuBar: true, title: "Mit Microsoft-Konto anmelden",
      webPreferences: {
        partition: "mslogin", // eigener, nicht gespeicherter Cookie-Speicher
        sandbox: true, contextIsolation: true, nodeIntegration: false, webviewTag: false,
      },
    });
    loginWindow = win;
    let done = false;
    const finish = (u) => {
      done = true;
      const q = new URL(u).searchParams;
      setImmediate(() => win.destroy());
      if (q.get("error")) reject(new Error(q.get("error_description") || q.get("error")));
      else if (q.get("state") !== state) reject(new Error("Ungültige Antwort vom Login"));
      else resolve({ code: q.get("code"), verifier });
    };
    const onNav = (e, u) => {
      if (done) return;
      if (u.startsWith(REDIRECT)) { e.preventDefault(); finish(u); }
      else if (!u.startsWith("https://")) e.preventDefault(); // nur verschlüsselte Seiten
    };
    win.webContents.on("will-redirect", onNav);
    win.webContents.on("will-navigate", onNav);
    // Popups der Anmeldeseite (z. B. Hilfe-Links) nicht in der App öffnen
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.on("closed", () => { loginWindow = null; if (!done) reject(new Error("Anmeldung abgebrochen")); });
    win.loadURL(url);
  });
}
let loginWindow = null;

async function tokenRequest(params) {
  const res = await net(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), scope: SCOPE, ...params }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.error === "invalid_grant" && params.grant_type === "refresh_token") {
      module.exports.logout(); // gespeicherte Anmeldung ist ungültig → löschen
      throw new Error("Xbox-Anmeldung abgelaufen – bitte neu anmelden");
    }
    throw new Error(data.error_description?.split("\r\n")[0] || data.error || "Token-Fehler");
  }
  if (data.refresh_token) saveRefreshToken(data.refresh_token);
  return data.access_token;
}

// ---------- Xbox Live ----------
const XSTS_ERRORS = {
  2148916233: "Zu diesem Microsoft-Konto gibt es noch kein Xbox-Profil.",
  2148916235: "Xbox Live ist in deinem Land nicht verfügbar.",
  2148916236: "Für dieses Konto ist eine Altersbestätigung nötig.",
  2148916237: "Für dieses Konto ist eine Altersbestätigung nötig.",
  2148916238: "Kinderkonto: Ein Erwachsener muss das Konto zu einer Familie hinzufügen.",
};

async function xblPost(url, body) {
  const res = await net(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "x-xbl-contract-version": "1" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(XSTS_ERRORS[err.XErr] || `Xbox-Anmeldung fehlgeschlagen (${res.status})`);
  }
  return res.json();
}

async function xboxAuth(msToken) {
  const user = await xblPost("https://user.auth.xboxlive.com/user/authenticate", {
    Properties: { AuthMethod: "RPS", SiteName: "user.auth.xboxlive.com", RpsTicket: `d=${msToken}` },
    RelyingParty: "http://auth.xboxlive.com", TokenType: "JWT",
  });
  const xsts = await xblPost("https://xsts.auth.xboxlive.com/xsts/authorize", {
    Properties: { SandboxId: "RETAIL", UserTokens: [user.Token] },
    RelyingParty: "http://xboxlive.com", TokenType: "JWT",
  });
  return `XBL3.0 x=${xsts.DisplayClaims.xui[0].uhs};${xsts.Token}`;
}

async function xblGet(url, auth, contract) {
  const res = await net(url, {
    headers: { Authorization: auth, "x-xbl-contract-version": contract, Accept: "application/json", "Accept-Language": "de-DE" },
  });
  if (!res.ok) throw new Error(`Xbox-API-Fehler (${res.status})`);
  return res.json();
}

async function fetchProfile(auth) {
  const data = await xblGet(
    "https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag,ModernGamertag,GameDisplayPicRaw,Gamerscore",
    auth, "2");
  const s = Object.fromEntries(data.profileUsers[0].settings.map((x) => [x.id, x.value]));
  const profile = {
    gamertag: s.ModernGamertag || s.Gamertag,
    gamerpic: /^https:\/\//.test(s.GameDisplayPicRaw || "")
      ? `${s.GameDisplayPicRaw}${s.GameDisplayPicRaw.includes("?") ? "&" : "?"}w=424&h=424` : null,
    gamerscore: Number(s.Gamerscore) || 0,
    friends: null,
  };

  try {
    const people = await xblGet("https://peoplehub.xboxlive.com/users/me/people/social/decoration/presencedetail", auth, "5");
    const list = (people.people || []).map((p) => ({
      gamertag: p.modernGamertag || p.gamertag,
      pic: p.displayPicRaw,
      online: p.presenceState === "Online",
      status: p.presenceText,
    }));
    profile.friends = { total: list.length, online: list.filter((f) => f.online).length, list };
    list.forEach((f) => { if (!/^https:\/\//.test(f.pic || "")) f.pic = null; }); // nur echte https-Bilder
  } catch { /* Freundesliste ist optional */ }

  saveProfile(profile);
  return profile;
}

// ---------- Öffentliche Funktionen ----------
module.exports = {
  status() {
    return { configured: !!clientId(), signedIn: !!loadRefreshToken(), profile: readStore().profile || null };
  },

  async login(parent) {
    if (!clientId()) throw new Error("Client-ID fehlt in config.json");
    if (loginWindow) { loginWindow.focus(); throw new Error("Das Anmeldefenster ist schon offen"); }
    const { code, verifier } = await interactiveLogin(parent);
    const msToken = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, code_verifier: verifier });
    return fetchProfile(await xboxAuth(msToken));
  },

  async refresh() {
    const refreshToken = loadRefreshToken();
    if (!clientId() || !refreshToken) return null;
    const msToken = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
    return fetchProfile(await xboxAuth(msToken));
  },

  logout() {
    try { fs.unlinkSync(storeFile()); } catch {}
  },
};
