const CACHE_NAME = 'flowfit-v1';
const PRECACHE_URLS = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/js/player.js',
    '/static/js/sounds.js',
    '/static/js/storage.js',
    '/static/manifest.json',
    '/static/icons/icon.svg',
];

// Install — precache shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API requests: network-first
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    return res;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Static assets & pages: cache-first, fallback to network
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(res => {
                    if (res.ok && event.request.method === 'GET') {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                });
            })
    );
});
