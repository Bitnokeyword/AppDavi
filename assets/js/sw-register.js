// ============================================
// 📦 REGISTRO DEL SERVICE WORKER
// ============================================

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registrado:', registration);

                // Verificar si hay actualizaciones
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nueva versión disponible
                            console.log('🔄 Nueva versión del SW disponible. Recarga la página.');
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('❌ Error al registrar Service Worker:', error);
            });

        // Escuchar mensajes del SW
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('📩 Mensaje del SW:', event.data);
        });
    } else {
        console.warn('⚠️ Service Workers no soportados en este navegador.');
    }
}

// ============================================
// NOTIFICAR ACTUALIZACIÓN
// ============================================

function showUpdateNotification() {
    const updateDiv = document.createElement('div');
    updateDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #141b2d;
        color: #e8edf5;
        padding: 16px 24px;
        border-radius: 16px;
        border: 1px solid rgba(74,124,247,0.3);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 99999;
        font-family: -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 16px;
        animation: slideUp 0.4s ease;
        max-width: 400px;
    `;
    updateDiv.innerHTML = `
        <span style="font-size:1.5rem;">🔄</span>
        <div>
            <div style="font-weight:600;">Nueva versión disponible</div>
            <div style="font-size:0.85rem; color:#8aa3c9;">Actualiza para obtener mejoras</div>
        </div>
        <button onclick="location.reload()" style="
            background: #4a7cf7;
            border: none;
            padding: 8px 16px;
            border-radius: 60px;
            color: white;
            font-weight: 600;
            cursor: pointer;
        ">Actualizar</button>
    `;
    document.body.appendChild(updateDiv);

    // Agregar keyframes si no existen
    if (!document.getElementById('sw-update-styles')) {
        const style = document.createElement('style');
        style.id = 'sw-update-styles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(100px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// CACHEAR DATOS DE FIRESTORE
// ============================================

export function cacheFirestoreData(collection, data) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_FIRESTORE_DATA',
            collection: collection,
            data: data
        });
        console.log(`📦 Enviando datos de ${collection} al SW para cachear`);
    } else {
        console.warn('⚠️ No hay SW activo para cachear datos');
    }
}

// ============================================
// REGISTRAR SINCRONIZACIÓN EN SEGUNDO PLANO
// ============================================

export async function registerBackgroundSync(tag = 'sync-backup') {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register(tag);
            console.log(`✅ Sincronización "${tag}" registrada`);
        } catch (error) {
            console.error('❌ Error al registrar sync:', error);
        }
    } else {
        console.warn('⚠️ Background Sync no soportado');
    }
}