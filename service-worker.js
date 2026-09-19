// Suman Gyan — offline app-shell cache
// Caches the static shell (HTML/CSS/JS/icons/fonts) so the app opens with no connection.
// AI-dependent features (Tutor chat, Visual Solver, live GK, calculator steps) still require
// a live network call and are correctly disabled by the app when offline — this worker only
// makes the *lessons and UI* work offline, which is what "offline mode" should mean.

const CACHE_NAME = 'suman-gyan-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon_192.png',
  './icons/icon_512.png',
  './icons/icon_180.png'
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
  const url = new URL(event.request.url);

  // Never cache/intercept calls to the AI API — those must always hit the network live.
  if (url.hostname.includes('api.anthropic.com') || url.hostname.includes('yourbackend.example.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            // Opportunistically cache same-origin GETs for next time offline.
            if (event.request.method === 'GET' && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
