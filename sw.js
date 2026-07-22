// ============================================
// 📦 SERVICE WORKER - Cache de Firestore
// ============================================

const CACHE_VERSION = 'v3';
const CACHE_NAME = `firestore-cache-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Recursos a cachear (HTML, CSS, JS, etc.)
  const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/admin.html',
    '/vendedor.html',
    '/pages/clientes.html',
    '/pages/escaneo-productos.html',
    '/pages/restaurar-backup.html',    // ← NUEVO
    '/assets/js/firebase-config.js',
    '/assets/js/sw-register.js',
    '/assets/css/main.css',
    '/offline.html',
    '/manifest.json'
];

// ============================================
// INSTALACIÓN - Cachear recursos estáticos
// ============================================

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Cacheando recursos...');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => {
                console.log('✅ Service Worker instalado correctamente');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Error al cachear:', error);
            })
    );
});

// ============================================
// ACTIVACIÓN - Limpiar caches viejos
// ============================================

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('firestore-cache-')) {
                        console.log('🗑️ Eliminando cache viejo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activado');
            return self.clients.claim();
        })
    );
});

// ============================================
// INTERCEPTAR PETICIONES - Cache First / Network Fallback
// ============================================

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Si es una petición a Firestore (API), interceptar
    if (url.hostname.includes('firestore.googleapis.com')) {
        event.respondWith(handleFirestoreRequest(event.request));
        return;
    }

    // Si es una petición a Firebase Auth
    if (url.hostname.includes('firebaseauth.googleapis.com')) {
        event.respondWith(handleAuthRequest(event.request));
        return;
    }

    // Para recursos estáticos: Cache First
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Actualizar cache en segundo plano
                    fetch(event.request).then((response) => {
                        if (response && response.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, response.clone());
                            });
                        }
                    });
                    return cachedResponse;
                }

                // Si no está en cache, ir a la red
                return fetch(event.request)
                    .then((response) => {
                        // Cachear la respuesta para futuras visitas
                        if (response && response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Si falla la red y no hay cache, mostrar página offline
                        return caches.match(OFFLINE_PAGE);
                    });
            })
    );
});

// ============================================
// MANEJAR PETICIONES A FIRESTORE
// ============================================

async function handleFirestoreRequest(request) {
    try {
        // Intentar obtener de la red
        const response = await fetch(request);
        if (response && response.status === 200) {
            // Cachear la respuesta para offline
            const clone = response.clone();
            const cache = await caches.open(CACHE_NAME);
            const cacheKey = request.url + '&_cache=' + Date.now();
            await cache.put(cacheKey, clone);
            return response;
        }
        throw new Error('Error en la red');
    } catch (error) {
        // Si falla la red, buscar en cache
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request.url + '&_cache=*');
        if (cachedResponse) {
            return cachedResponse;
        }

        // Si no hay cache, devolver datos simulados
        return new Response(
            JSON.stringify({
                offline: true,
                message: 'Estás offline. Los datos son de la última sesión.'
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// ============================================
// MANEJAR PETICIONES A AUTH
// ============================================

async function handleAuthRequest(request) {
    try {
        // Intentar red
        const response = await fetch(request);
        return response;
    } catch (error) {
        // Si falla, devolver error controlado
        return new Response(
            JSON.stringify({
                offline: true,
                message: 'Servicio de autenticación no disponible offline'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// ============================================
// ESCUCHAR MENSAJES DESDE LA APP
// ============================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_FIRESTORE_DATA') {
        // Guardar datos de Firestore en cache
        const { collection, data } = event.data;
        const cacheKey = `/firestore/${collection}/data`;
        const response = new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
        caches.open(CACHE_NAME).then((cache) => {
            cache.put(cacheKey, response);
            console.log(`📦 Datos de ${collection} cacheados`);
        });
    }
});

// ============================================
// SINCRONIZACIÓN EN SEGUNDO PLANO
// ============================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-backup') {
        event.waitUntil(performBackgroundSync());
    }
});

async function performBackgroundSync() {
    console.log('🔄 Sincronizando datos en segundo plano...');
    // Aquí se podrían enviar datos pendientes
    // Por ahora solo log
}