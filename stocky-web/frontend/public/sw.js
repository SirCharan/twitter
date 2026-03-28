// Stocky AI Service Worker — smart caching + offline fallback
// Cache name includes build timestamp — SW byte-diff triggers update on deploy
const CACHE_NAME = "stocky-1711612800";
const OFFLINE_URL = "/offline.html";

// Assets to precache on install
const PRECACHE_URLS = [
  "/offline.html",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/manifest.json",
];

// Install: precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy based on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (API calls to backend, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Static assets (JS, CSS, images, fonts): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Pages & API: network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Navigation requests get the offline page
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("", { status: 503 });
        })
      )
  );
});

function isStaticAsset(pathname) {
  return /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|ico)$/.test(pathname) ||
    pathname.startsWith("/_next/static/");
}
