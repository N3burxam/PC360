// PC360 – eingebauter Internet Explorer im Stil der Xbox 360.
// Die Webseiten laufen in Electrons eigenem Chromium (Open Source) in einer abgeschotteten
// WebContentsView: eigene Session, Sandbox, kein Preload → Webseiten sehen keine PC360-Funktionen.
// Die Oberfläche (Leiste, Cursor, Tastatur, Web Hub) zeichnet src/browser.js; hier nur Steuerung.
const { WebContentsView, session } = require("electron");

const PARTITION = "persist:pc360web";
const isWeb = (u) => /^https?:\/\//i.test(String(u || ""));
const WORLD = 1360; // eigene, isolierte JS-Welt für Cursor und Textfeld-Abfrage

let win = null;     // Hauptfenster
let view = null;    // aktuelle Webansicht
let cur = { x: 0, y: 0, show: false };
let zoom = 1;
let errorFor = "";  // Adresse, für die gerade unsere Fehlerseite angezeigt wird
let fullscreen = false; // Seite zeigt gerade ein Element im Vollbild (Video, Bild, Spiel)

function webSession() {
  const ses = session.fromPartition(PARTITION);
  if (!ses.__pc360) {
    ses.__pc360 = true;
    ses.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === "fullscreen"));
    ses.setPermissionCheckHandler(() => false);
    ses.on("will-download", (e) => e.preventDefault()); // keine Downloads
    // Ohne "Electron/…" im User-Agent liefern Seiten die normale Chrome-Version aus
    ses.setUserAgent(ses.getUserAgent().replace(/\s(PC360|pc360|Electron)\/\S+/g, ""));
  }
  return ses;
}

function send(extra = {}) {
  if (!win || win.isDestroyed()) return;
  const wc = view?.webContents;
  const h = wc?.navigationHistory;
  win.webContents.send("web:state", wc ? {
    open: true,
    url: errorFor || wc.getURL(),
    title: errorFor ? "Fehler" : wc.getTitle(),
    loading: wc.isLoading(),
    back: !!h?.canGoBack(),
    forward: !!h?.canGoForward(),
    zoom,
    fullscreen,
    ...extra,
  } : { open: false });
}

// Fehlerseite wie im Internet Explorer der 360: breiter blauer Balken, große hellblaue Überschrift, Tipps als Liste
const errorPage = (url, desc) => "data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><meta charset="utf-8">
<title>Fehler</title><body style="margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#3a3a3a">
<div style="margin:136px 0 0 11.9vw;max-width:1400px"><div style="height:8px;background:#1a73f0;width:1038px;max-width:100%;margin-bottom:22px"></div>
<h1 style="font-weight:300;color:#2b7de9;font-size:52px;margin:0 0 18px;line-height:1.15">Verbindung zur Website nicht möglich</h1>
<p style="font-size:23px;margin:0 0 34px">Die Website ist nicht verfügbar oder es besteht keine Verbindung zum Internet. Folgendes kannst du versuchen:</p>
<ul style="font-size:23px;line-height:2;margin:0;padding-left:63px"><li>Prüfe, ob die Webadresse richtig ist.</li><li>Lade die Seite in ein paar Minuten neu.</li>
<li>Prüfe, ob alle Netzwerkkabel eingesteckt sind.</li><li>Prüfe, ob du mit deinem WLAN verbunden bist.</li><li>Starte den Router neu.</li></ul>
<p style="font-size:15px;color:#9a9a9a;margin-top:40px">${String(url).replace(/[<>&"]/g, "")} · ${String(desc).replace(/[<>&"]/g, "")}</p></div>`);

function create() {
  view = new WebContentsView({
    webPreferences: {
      session: webSession(),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
    },
  });
  view.setBackgroundColor("#ffffff");
  const wc = view.webContents;
  // Nur http/https; Pop-ups öffnen in derselben Ansicht (die 360 hatte auch nur ein Fenster)
  wc.setWindowOpenHandler(({ url }) => { if (isWeb(url)) wc.loadURL(url); return { action: "deny" }; });
  wc.on("will-navigate", (e, url) => { if (!isWeb(url)) e.preventDefault(); });
  wc.on("will-redirect", (e, url) => { if (!isWeb(url)) e.preventDefault(); });
  wc.on("will-attach-webview", (e) => e.preventDefault());
  wc.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.control && input.shift && input.key.toLowerCase() === "q") { e.preventDefault(); require("electron").app.quit(); }
  });
  wc.on("did-start-loading", () => send());
  wc.on("did-stop-loading", () => send());
  wc.on("did-navigate", (_e, url) => { if (isWeb(url)) errorFor = ""; send({ visited: isWeb(url) ? url : undefined }); });
  wc.on("did-navigate-in-page", () => send());
  wc.on("page-title-updated", () => send());
  wc.on("dom-ready", () => { wc.setZoomFactor(zoom); drawCursor(); });
  wc.on("did-fail-load", (_e, code, desc, url, isMain) => {
    if (!isMain || code === -3 || !isWeb(url)) return; // -3 = abgebrochen
    errorFor = url;
    wc.loadURL(errorPage(url, desc));
  });
  // Vollbild der Seite (requestFullscreen): Eingaben bleiben bei PC360 (sonst bekommt die Seite den Tastaturfokus),
  // Cursor neu zeichnen, damit er über dem Vollbild-Element liegt
  const fsChange = (on) => { fullscreen = on; if (win && !win.isDestroyed()) win.webContents.focus(); drawCursor(); setTimeout(drawCursor, 300); send(); };
  wc.on("enter-html-full-screen", () => fsChange(true));
  wc.on("leave-html-full-screen", () => fsChange(false));
  wc.on("render-process-gone", () => { errorFor = wc.getURL(); wc.loadURL(errorPage(errorFor, "Seite abgestürzt")); });
  win.contentView.addChildView(view);
}

// 360-Cursor (Tropfen, Spitze oben links = Klickpunkt), direkt in die Seite gezeichnet – in einer eigenen JS-Welt,
// die Seite selbst sieht ihn nicht. Grau, über Links/Knöpfen/Feldern grün (wie auf der Konsole).
const DROP = '<svg viewBox="13 9 56 71" width="100%" height="100%" style="display:block"><defs>'
  + '<linearGradient id="__pc360n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4e4e4"/><stop offset="1" stop-color="#777"/></linearGradient>'
  + '<linearGradient id="__pc360h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#86f241"/><stop offset="1" stop-color="#36b50b"/></linearGradient></defs>'
  + '<path fill-rule="evenodd" stroke-linejoin="round" stroke-width="3" fill="url(#__pc360n)" stroke="url(#__pc360n)" '
  + 'd="M26 11 L55.3 30.3 A26 26 0 1 1 16.1 44.6 Z M27 52 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 Z"/></svg>';
function drawCursor() {
  if (!view) return;
  const S = Math.round((win?.getContentBounds().height || 1080) * 0.048); // ≈ 52 px bei 1080p
  const x = cur.x / zoom, y = cur.y / zoom;
  const code = `(()=>{const S=${S},H=Math.round(S*71/56),Z=${zoom},X=${x},Y=${y};
    let c=document.getElementById("__pc360cursor");
    if(!c){c=document.createElement("div");c.id="__pc360cursor";
      c.style.cssText="all:initial;position:fixed;z-index:2147483647;pointer-events:none;transform-origin:0 0;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))";
      c.innerHTML=${JSON.stringify(DROP)};c.setAttribute("popover","manual");
      (document.body||document.documentElement).appendChild(c);}
    // als Popover in der obersten Ebene (top layer) – nur so liegt er auch über einem Vollbild-Element; nach jedem
    // Vollbild-Wechsel neu öffnen, damit er wieder ganz oben liegt
    // auch über modalen Dialogen (z. B. Cookie-Banner mit <dialog>) und Popovers der Seite: dann jedes Mal neu nach oben holen
    const fe=document.fullscreenElement||null;
    if(c.showPopover){try{const open=c.matches(":popover-open");const other=!!document.querySelector(":modal,:popover-open:not(#__pc360cursor)");
      if(!open||c.__fe!==fe||other){if(open)c.hidePopover();c.showPopover();c.__fe=fe;}}catch(_){}}
    else if(fe&&c.parentNode!==fe&&fe.tagName!=="VIDEO")fe.appendChild(c);
    // Öffnet die Seite einen Dialog/ein Popover oder wechselt ins Vollbild, während der Cursor stillsteht,
    // holt er sich selbst wieder nach oben (einmal pro Seite eingerichtet, nur in der isolierten Welt)
    if(!window.__pc360raise){window.__pc360raise=1;
      const raise=()=>setTimeout(()=>{const k=document.getElementById("__pc360cursor");if(!k||!k.showPopover)return;
        try{if(k.matches(":popover-open"))k.hidePopover();k.showPopover();k.__fe=document.fullscreenElement||null;}catch(_){}},0);
      document.addEventListener("fullscreenchange",raise,true);
      document.addEventListener("toggle",(ev)=>{if(ev.target&&ev.target.id!=="__pc360cursor")raise();},true);
      new MutationObserver((ms)=>{if(ms.some((m)=>m.target.id!=="__pc360cursor"))raise();})
        .observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["open"]});}
    c.style.width=S+"px";c.style.height=H+"px";c.style.transform="scale("+(1/Z)+")";
    c.style.left=(X-13/56*S/Z)+"px";c.style.top=(Y-2/71*H/Z)+"px";c.style.display="${cur.show ? "block" : "none"}";
    const e=document.elementFromPoint(X,Y);
    const hot=!!e&&(!!e.closest("a[href],button,input,select,textarea,label,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=option],[onclick],[contenteditable]")||getComputedStyle(e).cursor==="pointer");
    const p=c.querySelector("path"),g=hot?"url(#__pc360h)":"url(#__pc360n)";p.setAttribute("fill",g);p.setAttribute("stroke",g);})()`;
  view.webContents.executeJavaScriptInIsolatedWorld(WORLD, [{ code }]).catch(() => {});
}

// Was ist gerade fokussiert? → Textfeld = Bildschirmtastatur öffnen
const FOCUS_INFO = `(()=>{const a=document.activeElement;if(!a)return null;
  const t=(a.type||"").toLowerCase();
  const text=a.isContentEditable||a.tagName==="TEXTAREA"||(a.tagName==="INPUT"&&!["button","submit","reset","checkbox","radio","range","color","file","image","hidden"].includes(t));
  if(!text)return null;
  return {password:t==="password",multiline:a.tagName==="TEXTAREA"||a.isContentEditable,
    value:t==="password"?"":String(a.value??a.innerText??"").slice(0,2000),
    label:String(a.getAttribute("aria-label")||a.placeholder||a.name||a.title||"").slice(0,80)};})()`;

const KEYS = { Backspace: "Backspace", Enter: "Return", Tab: "Tab", Escape: "Escape", Left: "Left", Right: "Right", Delete: "Delete" };

const api = {
  open(url) {
    if (!isWeb(url)) throw new Error("Nur http/https");
    if (!view) create();
    errorFor = "";
    view.setVisible(true);
    view.webContents.loadURL(url);
    send();
  },
  close() {
    if (!view) return;
    win.contentView.removeChildView(view);
    view.webContents.close();
    view = null;
    errorFor = "";
    fullscreen = false;
    send();
  },
  show(on) { view?.setVisible(!!on); },
  exitFullscreen() {
    if (!view || !fullscreen) return;
    return view.webContents.executeJavaScriptInIsolatedWorld(WORLD, [{ code: "document.fullscreenElement&&document.exitFullscreen()" }]).catch(() => {});
  },
  async snapshot() {
    if (!view) return null;
    const img = await view.webContents.capturePage();
    return img.isEmpty() ? null : "data:image/jpeg;base64," + img.resize({ width: Math.min(1280, img.getSize().width) }).toJPEG(70).toString("base64");
  },
  bounds(r) {
    if (!view || !r) return;
    const n = (v) => Math.max(0, Math.round(Number(v) || 0));
    view.setBounds({ x: n(r.x), y: n(r.y), width: n(r.w), height: n(r.h) });
  },
  nav(cmd) {
    const wc = view?.webContents;
    if (!wc) return;
    const h = wc.navigationHistory;
    if (cmd === "back") {
      // Von der eigenen Fehlerseite aus die kaputte Adresse überspringen
      if (h.canGoBack()) { errorFor = ""; h.goBack(); }
    } else if (cmd === "forward") { if (h.canGoForward()) h.goForward(); }
    else if (cmd === "reload") { if (errorFor) wc.loadURL(errorFor); else wc.reload(); }
    else if (cmd === "stop") wc.stop();
  },
  pointer(x, y, show = true) {
    cur = { x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0), show: !!show };
    if (!view) return;
    if (show) view.webContents.sendInputEvent({ type: "mouseMove", x: cur.x, y: cur.y });
    drawCursor();
  },
  async click() {
    if (!view) return null;
    const wc = view.webContents;
    const p = { x: cur.x, y: cur.y, button: "left", clickCount: 1 };
    wc.sendInputEvent({ type: "mouseDown", ...p });
    wc.sendInputEvent({ type: "mouseUp", ...p });
    await new Promise((r) => setTimeout(r, 160));
    if (!view) return null;
    return view.webContents.executeJavaScriptInIsolatedWorld(WORLD, [{ code: FOCUS_INFO }]).catch(() => null);
  },
  scroll(dx, dy) {
    if (!view) return;
    view.webContents.sendInputEvent({ type: "mouseWheel", x: cur.x, y: cur.y,
      deltaX: -Math.round(Number(dx) || 0), deltaY: -Math.round(Number(dy) || 0), canScroll: true });
  },
  type(text) {
    if (!view) return;
    for (const ch of [...String(text).slice(0, 500)]) view.webContents.sendInputEvent({ type: "char", keyCode: ch });
  },
  key(name) {
    const k = KEYS[name];
    if (!view || !k) return;
    const wc = view.webContents;
    wc.sendInputEvent({ type: "keyDown", keyCode: k });
    if (k === "Return") wc.sendInputEvent({ type: "char", keyCode: "\r" });
    wc.sendInputEvent({ type: "keyUp", keyCode: k });
  },
  zoom(dir) {
    if (!view) return;
    zoom = Math.min(3, Math.max(0.5, Math.round((zoom + (dir > 0 ? 0.1 : -0.1)) * 10) / 10));
    view.webContents.setZoomFactor(zoom);
    drawCursor();
    send();
  },
};

function register(ipcMain, isTrusted, getWin) {
  for (const [name, fn] of Object.entries(api)) {
    ipcMain.handle(`web:${name}`, async (e, ...args) => {
      if (!isTrusted(e)) return { error: "Nicht erlaubt" };
      win = getWin();
      try { return { data: await fn(...args) }; } catch (err) { return { error: err.message || String(err) }; }
    });
  }
}

module.exports = { register, PARTITION };
