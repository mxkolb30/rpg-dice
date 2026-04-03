const CACHE_NAME = 'rpgdice-v7';
const BASE = self.registration.scope;
const ASSETS = [
    '',
    'index.html',
    'style.css',
    'app.js',
    'dice.js',
    'manifest.json',
    'icons/icon.svg',
    'sounds/applause_1.mp3',
    'sounds/aww.mp3',
    'sounds/bullseye.mp3',
    'sounds/crickets.mp3',
    'sounds/roll_dice_1.mp3',
    'sounds/roll_dice_2.mp3',
    'sounds/roll_dice_3.mp3',
    'sounds/sad_trombone.mp3',
    'sounds/tada.mp3',
].map((path) => new URL(path, BASE).href);

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cached) => {
            return cached || fetch(e.request).then((response) => {
                if (response.ok && e.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                }
                return response;
            });
        })
    );
});
