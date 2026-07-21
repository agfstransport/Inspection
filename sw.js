// AGFS Vehicle Inspection — Service Worker
// Caches the app shell so it opens even with no signal.
// Never caches calls to script.google.com — those always need to be live.

const CACHE_NAME = "agfs-inspection-v1";
const APP_SHELL = [
  "./agfs_inspection_app_v11.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Google Apps Script calls — always go to the network,
  // so submissions and dashboard data stay live and accurate.
  if (url.hostname.includes("script.google.com") || url.hostname.includes("googleusercontent.com")) {
    return; // let the browser handle it normally
  }

  // App shell: try cache first, fall back to network, and refresh the cache.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
