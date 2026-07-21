// AGFS Vehicle Inspection — Service Worker
// Network-first: always tries to get the latest version first, and only
// falls back to the cached copy if there's no connection. This means
// updates to the app apply immediately on next load instead of needing
// a stale cache to expire.

const CACHE_NAME = "agfs-inspection-v2"; // bumped to force old cache eviction
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

  // Never cache the external PDF libraries — let the browser's normal
  // HTTP cache handle those, no need to duplicate in our cache.
  if (url.hostname.includes("cdnjs.cloudflare.com")) {
    return;
  }

  // App shell: network-first, cache as a fallback for offline use only.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
