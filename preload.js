// Brücke zwischen Oberfläche und Hauptprozess (nur diese Funktionen sind im Dashboard sichtbar)
const { contextBridge, ipcRenderer } = require("electron");

const call = (name) => (...args) => ipcRenderer.invoke(name, ...args);

contextBridge.exposeInMainWorld("pc360", {
  xbox: {
    status: call("xbox:status"),
    login: call("xbox:login"),
    refresh: call("xbox:refresh"),
    logout: call("xbox:logout"),
  },
  sys: {
    info: call("sys:info"),
    network: call("sys:network"),
    drives: call("sys:drives"),
    open: call("sys:open"),         // (url, fallbackUrl)
    folder: call("sys:folder"),     // ("music" | "videos" | ...)
    power: call("sys:power"),       // ("shutdown" | "restart" | "quit")
    bingImage: call("sys:bingImage"),
  },
  steam: {
    library: call("steam:library"),
    launch: call("steam:launch"),   // (appid)
  },
  x360: {                            // Xbox 360-Spiele mit Xenia (xenia.js)
    status: call("x360:status"), library: call("x360:library"), install: call("x360:install"),
    pickExe: call("x360:pickExe"), pickFolder: call("x360:pickFolder"),
    launch: call("x360:launch"),     // (id aus library)
    stop: call("x360:stop"),
    onState: (fn) => { ipcRenderer.on("x360:state", (_e, s) => fn(s)); },
  },
  avatar: {                         // 3D-Avatar (GLB-Export von 360sona, liegt lokal)
    model: call("avatar:model"),
  },
  search: {
    suggest: call("search:suggest"), // (text) → Bing-Vorschläge
    steam: call("search:steam"),     // (text) → Spiele aus dem Steam-Shop
  },
  spotify: {                         // Spotify für Xbox Music (spotify.js)
    status: call("spotify:status"), login: call("spotify:login"), logout: call("spotify:logout"), library: call("spotify:library"),
    album: call("spotify:album"), search: call("spotify:search"), playlist: call("spotify:playlist"), artist: call("spotify:artist"),
    player: call("spotify:player"), play: call("spotify:play"), control: call("spotify:control"),
  },
  web: {                             // eingebauter Browser (web.js)
    open: call("web:open"), close: call("web:close"), show: call("web:show"), snapshot: call("web:snapshot"), bounds: call("web:bounds"),
    nav: call("web:nav"), pointer: call("web:pointer"), click: call("web:click"), scroll: call("web:scroll"),
    type: call("web:type"), key: call("web:key"), zoom: call("web:zoom"), exitFullscreen: call("web:exitFullscreen"),
    onState: (fn) => { ipcRenderer.on("web:state", (_e, s) => fn(s)); },
  },
});
