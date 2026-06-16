// Service worker for "Our Plans" — caches the app shell for fast/offline-ish
// loading, but NEVER caches Firebase requests, since event/RSVP data must
// always be fetched live. Cache version bump = forces everyone to get the
// latest index.html on next visit.
const CACHE_NAME = 'our-plans-v1';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept Firebase, Google APIs, or any non-GET request —
  // these must always hit the network so data stays live.
  if (
    event.request.method !== 'GET' ||
    url.includes('firebaseio.com') ||
    url.includes('firebasedatabase.app') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('wa.me')
  ) {
    return; // let the browser handle it normally
  }

  // Network-first for the app shell: try fresh, fall back to cache if offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
