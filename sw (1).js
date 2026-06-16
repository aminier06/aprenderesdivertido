/**
 * Service Worker – Campamento Aprender es Divertido
 * Estrategia: Cache First para recursos estáticos, Network First para el HTML.
 * Versión: aumentar CACHE_VERSION al hacer deploy para invalidar la caché.
 */

const CACHE_VERSION = "aed-v1";
const CACHE_STATIC  = CACHE_VERSION + "-static";

// Recursos estáticos que se precargarán al instalar el SW
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/logo_campamento.png",
  "/logominerd.jpeg",
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@700&display=swap",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

// ── Instalación: precargar recursos ──────────────────────────────────────────
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(function(cache) {
      return cache.addAll(PRECACHE_URLS.map(function(url) {
        return new Request(url, { mode: "no-cors" });
      }));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activación: limpiar cachés viejas ────────────────────────────────────────
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key.startsWith("aed-") && key !== CACHE_STATIC;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: estrategia según tipo de recurso ───────────────────────────────────
self.addEventListener("fetch", function(event) {
  var url = new URL(event.request.url);

  // Nunca interceptar llamadas al backend de Google Apps Script (JSONP)
  if (url.hostname.includes("script.google.com")) {
    return; // Dejar pasar sin interferir
  }

  // Para el documento HTML: Network First (siempre intentar actualizar)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var responseClone = response.clone();
        caches.open(CACHE_STATIC).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function() {
        return caches.match("/index.html");
      })
    );
    return;
  }

  // Para recursos estáticos (CSS, JS, imágenes, fuentes): Cache First
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Solo cachear respuestas exitosas
        if (!response || response.status !== 200) return response;
        var responseClone = response.clone();
        caches.open(CACHE_STATIC).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
