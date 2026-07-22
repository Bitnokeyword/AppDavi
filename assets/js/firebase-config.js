// ============================================
// 🔥 FIREBASE CONFIGURACIÓN
// ============================================

// 👇 REEMPLAZA CON TUS DATOS DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBE0TJJt1QRt0rObFv04vSHWo2EAivO_Gk",
    authDomain: "appdavi-pdlc.firebaseapp.com",
    databaseURL: "https://appdavi-pdlc-default-rtdb.firebaseio.com",
    projectId: "appdavi-pdlc",
    storageBucket: "appdavi-pdlc.firebasestorage.app",
    messagingSenderId: "234573077376",
    appId: "1:234573077376:web:6b62ad8c118a29de7dbf65"
};
// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar Firestore para usar timestamps
db.settings({ timestampsInSnapshots: true });

// ============================================
// 📦 COLECCIONES EN FIRESTORE
// ============================================

const COLECCIONES = {
    USUARIOS: 'usuarios',
    PRODUCTOS: 'productos',
    VENTAS: 'ventas',
    CLIENTES: 'clientes',
    CARGAS: 'cargas',
    RUTAS: 'rutas',
    REPORTES: 'reportes'
};

// ============================================
// 🧪 DATOS DE PRUEBA (para poblar la BD)
// ============================================

const PRODUCTOS_INICIALES = [
    { codigo: '7501234567890', nombre: 'Smartphone X Pro', emoji: '📱', precio: 12999, stock: 50 },
    { codigo: '7509876543210', nombre: 'Laptop Gamer Ultra', emoji: '💻', precio: 24999, stock: 30 },
    { codigo: '7501112223334', nombre: 'Audífonos Bluetooth', emoji: '🎧', precio: 899, stock: 100 },
    { codigo: '7504445556667', nombre: 'Monitor 4K 32"', emoji: '🖥️', precio: 8499, stock: 25 },
    { codigo: '7507778889990', nombre: 'Teclado Mecánico RGB', emoji: '⌨️', precio: 1299, stock: 60 },
    { codigo: '7501239874563', nombre: 'Mouse Inalámbrico Pro', emoji: '🖱️', precio: 599, stock: 80 },
    { codigo: '7504567891234', nombre: 'Cámara Web 4K', emoji: '📷', precio: 2499, stock: 40 },
    { codigo: '7503216549872', nombre: 'Tablet Ultra Slim', emoji: '📟', precio: 6999, stock: 35 },
    { codigo: '7506543219876', nombre: 'Smartwatch Pro', emoji: '⌚', precio: 4599, stock: 45 },
    { codigo: '7507891234568', nombre: 'Cargador Rápido 65W', emoji: '🔋', precio: 499, stock: 120 }
];

// ============================================
// 🚀 FUNCIÓN PARA POBLAR DATOS INICIALES
// ============================================

async function poblarProductosIniciales() {
    try {
        console.log('📦 Verificando productos en Firestore...');
        const snapshot = await db.collection(COLECCIONES.PRODUCTOS).get();
        
        if (snapshot.empty) {
            console.log('📦 No hay productos. Insertando datos iniciales...');
            const batch = db.batch();
            
            PRODUCTOS_INICIALES.forEach(producto => {
                const docRef = db.collection(COLECCIONES.PRODUCTOS).doc(producto.codigo);
                batch.set(docRef, {
                    ...producto,
                    creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
                    actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            console.log('✅ Productos iniciales insertados correctamente');
        } else {
            console.log(`✅ ${snapshot.size} productos ya existen en Firestore`);
        }
    } catch (error) {
        console.error('❌ Error al poblar productos:', error);
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', poblarProductosIniciales);