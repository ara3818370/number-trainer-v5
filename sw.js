// sw.js — Service Worker: Cache First with Network Fallback
// Number Trainer v5 "Steve Edition"

const CACHE_VERSION = 'nlt-v5';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/tts.js',
  './js/confuser.js',
  './js/game.js',
  './js/categories.js',
  './js/numbers-en.js',
  './js/numbers-de.js',
  './js/numbers-uk.js',
  './js/i18n.js',
  './js/ui.js',
  './js/sound.js',
  './js/haptics.js',
  './js/progress.js',
  './js/onboarding.js',
  './js/settings.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: cache all static assets ───────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Cache First + navigation handler ────────────────────────────────

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then(cached => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
