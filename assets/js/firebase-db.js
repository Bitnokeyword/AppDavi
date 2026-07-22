// ============================================
// 🗄️ FIRESTORE - Funciones CRUD
// ============================================

// ===== PRODUCTOS =====

// Obtener todos los productos
async function obtenerProductos() {
    try {
        const snapshot = await db.collection(COLECCIONES.PRODUCTOS).get();
        const productos = [];
        snapshot.forEach(doc => {
            productos.push({ id: doc.id, ...doc.data() });
        });
        return productos;
    } catch (error) {
        console.error('❌ Error al obtener productos:', error);
        return [];
    }
}

// Buscar producto por código
async function buscarProductoPorCodigo(codigo) {
    try {
        const docRef = db.collection(COLECCIONES.PRODUCTOS).doc(codigo);
        const doc = await docRef.get();
        
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error('❌ Error al buscar producto:', error);
        return null;
    }
}

// Actualizar stock de un producto
async function actualizarStock(codigo, nuevaCantidad) {
    try {
        await db.collection(COLECCIONES.PRODUCTOS).doc(codigo).update({
            stock: nuevaCantidad,
            actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('❌ Error al actualizar stock:', error);
        return { success: false, error: error.message };
    }
}

// ===== VENTAS =====

// Registrar una venta
async function registrarVenta(datosVenta) {
    try {
        const ventaRef = db.collection(COLECCIONES.VENTAS).doc();
        await ventaRef.set({
            ...datosVenta,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, id: ventaRef.id };
    } catch (error) {
        console.error('❌ Error al registrar venta:', error);
        return { success: false, error: error.message };
    }
}

// Obtener ventas de un vendedor
async function obtenerVentasPorVendedor(vendedorId) {
    try {
        const snapshot = await db.collection(COLECCIONES.VENTAS)
            .where('vendedorId', '==', vendedorId)
            .orderBy('fecha', 'desc')
            .get();
        
        const ventas = [];
        snapshot.forEach(doc => {
            ventas.push({ id: doc.id, ...doc.data() });
        });
        return ventas;
    } catch (error) {
        console.error('❌ Error al obtener ventas:', error);
        return [];
    }
}

// ===== CLIENTES =====

// Registrar cliente
async function registrarCliente(datosCliente) {
    try {
        const clienteRef = db.collection(COLECCIONES.CLIENTES).doc();
        await clienteRef.set({
            ...datosCliente,
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, id: clienteRef.id };
    } catch (error) {
        console.error('❌ Error al registrar cliente:', error);
        return { success: false, error: error.message };
    }
}

// Obtener clientes
async function obtenerClientes() {
    try {
        const snapshot = await db.collection(COLECCIONES.CLIENTES).orderBy('nombre').get();
        const clientes = [];
        snapshot.forEach(doc => {
            clientes.push({ id: doc.id, ...doc.data() });
        });
        return clientes;
    } catch (error) {
        console.error('❌ Error al obtener clientes:', error);
        return [];
    }
}

// ===== CARGAS (Escaneo) =====

// Registrar carga de productos
async function registrarCarga(datosCarga) {
    try {
        const cargaRef = db.collection(COLECCIONES.CARGAS).doc();
        await cargaRef.set({
            ...datosCarga,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, id: cargaRef.id };
    } catch (error) {
        console.error('❌ Error al registrar carga:', error);
        return { success: false, error: error.message };
    }
}

// Obtener cargas de un vendedor
async function obtenerCargasPorVendedor(vendedorId) {
    try {
        const snapshot = await db.collection(COLECCIONES.CARGAS)
            .where('vendedorId', '==', vendedorId)
            .orderBy('fecha', 'desc')
            .get();
        
        const cargas = [];
        snapshot.forEach(doc => {
            cargas.push({ id: doc.id, ...doc.data() });
        });
        return cargas;
    } catch (error) {
        console.error('❌ Error al obtener cargas:', error);
        return [];
    }
}

// ===== REPORTES =====

// Obtener estadísticas generales (para admin)
async function obtenerEstadisticas() {
    try {
        // Obtener total de ventas
        const ventasSnapshot = await db.collection(COLECCIONES.VENTAS).get();
        const totalVentas = ventasSnapshot.size;
        
        // Obtener total de productos
        const productosSnapshot = await db.collection(COLECCIONES.PRODUCTOS).get();
        const totalProductos = productosSnapshot.size;
        
        // Obtener total de clientes
        const clientesSnapshot = await db.collection(COLECCIONES.CLIENTES).get();
        const totalClientes = clientesSnapshot.size;
        
        // Obtener total de usuarios
        const usuariosSnapshot = await db.collection(COLECCIONES.USUARIOS).get();
        const totalUsuarios = usuariosSnapshot.size;
        
        return {
            totalVentas,
            totalProductos,
            totalClientes,
            totalUsuarios
        };
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        return null;
    }
}

// ===== ESCUCHAR CAMBIOS EN TIEMPO REAL =====

// Escuchar cambios en productos (para panel admin)
function escucharProductos(callback) {
    return db.collection(COLECCIONES.PRODUCTOS)
        .onSnapshot((snapshot) => {
            const productos = [];
            snapshot.forEach(doc => {
                productos.push({ id: doc.id, ...doc.data() });
            });
            callback(productos);
        }, (error) => {
            console.error('❌ Error al escuchar productos:', error);
        });
}

// Escuchar ventas en tiempo real
function escucharVentas(vendedorId, callback) {
    let query = db.collection(COLECCIONES.VENTAS);
    
    if (vendedorId) {
        query = query.where('vendedorId', '==', vendedorId);
    }
    
    return query.orderBy('fecha', 'desc')
        .onSnapshot((snapshot) => {
            const ventas = [];
            snapshot.forEach(doc => {
                ventas.push({ id: doc.id, ...doc.data() });
            });
            callback(ventas);
        }, (error) => {
            console.error('❌ Error al escuchar ventas:', error);
        });
}