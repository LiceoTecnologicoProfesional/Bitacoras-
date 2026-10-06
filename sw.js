const CACHE = "litpa-flat-v1";
const ASSETS = [
  "./index.html",
  "./maestro.html",
  "./maestro-panel.html",
  "./tablero.html",
  "./horario.html",
  "./pantalla.html",
  "./administracion.html",
  "./estilos.css",
  "./Logo.png",
  "./CooperBlack.ttf",
  "./config.js",
  "./api.js",
  "./util.js",
  "./reporte.js",
  "./plantilla-horarios.js",
  "./plantilla-maestros.js",
  "./splash.js",
  "./auth.js",
  "./install.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) { return res; }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
