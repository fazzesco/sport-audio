// ========================================
// SERVICE WORKER - PWA Offline Support
// ========================================

const CACHE_NAME = 'padel-voice-tracker-v1.0';
const STATIC_CACHE_NAME = 'padel-static-v1.0';

// File da cachare per funzionamento offline
const CACHE_URLS = [
    '/',
    '/index.html',
    '/voice-controller.js',
    '/audio-synthesis.js',
    '/manifest.json'
];

// Installazione Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Caching app shell');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                console.log('✅ Service Worker: App shell cached');
                // Forza attivazione immediata
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Cache failed', error);
            })
    );
});

// Attivazione Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        // Pulisci cache vecchie
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        // Mantieni solo cache correnti
                        return cacheName !== STATIC_CACHE_NAME && 
                               cacheName !== CACHE_NAME;
                    })
                    .map((cacheName) => {
                        console.log('🗑️ Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => {
            console.log('✅ Service Worker: Activated');
            // Prendi controllo di tutte le pagine immediatamente
            return self.clients.claim();
        })
    );
});

// Intercettazione richieste - Strategia Cache First per risorse statiche
self.addEventListener('fetch', (event) => {
    // Solo per richieste GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Strategia per risorse statiche dell'app
    if (CACHE_URLS.some(url => event.request.url.includes(url.replace('/', '')))) {
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('📱 Service Worker: Serving from cache', event.request.url);
                        return cachedResponse;
                    }
                    
                    // Se non in cache, fetch dalla rete e salva in cache
                    return fetch(event.request)
                        .then((networkResponse) => {
                            // Verifica che la risposta sia valida
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }
                            
                            // Clona la risposta per salvarla in cache
                            const responseToCache = networkResponse.clone();
                            
                            caches.open(STATIC_CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                            
                            console.log('🌐 Service Worker: Fetched and cached', event.request.url);
                            return networkResponse;
                        })
                        .catch(() => {
                            console.log('❌ Service Worker: Network failed, no cache available');
                            // Ritorna una pagina offline se disponibile
                            if (event.request.destination === 'document') {
                                return caches.match('/');
                            }
                        });
                })
        );
    }
    
    // Per tutte le altre richieste, passa alla rete normalmente
    else {
        event.respondWith(
            fetch(event.request).catch(() => {
                // In caso di errore di rete, prova la cache
                return caches.match(event.request);
            })
        );
    }
});

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⏭️ Service Worker: Skip waiting requested');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            status: 'active'
        });
    }
});

// Gestione aggiornamenti in background
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('🔄 Service Worker: Background sync triggered');
        // Qui puoi aggiungere logica per sincronizzare dati quando torna la connessione
    }
});

// Gestione notifiche push (per futuro)
self.addEventListener('push', (event) => {
    console.log('📬 Service Worker: Push message received');
    
    const options = {
        body: event.data ? event.data.text() : 'Messaggio da Padel Tracker',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Apri App',
                icon: '/icon-192.png'
            },
            {
                action: 'close',
                title: 'Chiudi',
                icon: '/icon-192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Padel Voice Tracker', options)
    );
});

// Gestione click notifiche
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Service Worker: Notification click received');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        // Apri/focalizza l'app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Log per debugging
console.log('📱 Service Worker: Script loaded', {
    cache: CACHE_NAME,
    urls: CACHE_URLS
});