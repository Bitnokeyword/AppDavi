// ============================================
// 📋 FUNCIONES ADICIONALES PARA CLIENTES
// ============================================

// Obtener cliente por ID desde Firestore
async function obtenerClientePorId(id) {
    try {
        const doc = await db.collection('clientes').doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('❌ Error al obtener cliente:', error);
        return null;
    }
}

// Buscar cliente por teléfono
async function buscarClientePorTelefono(telefono) {
    try {
        const snapshot = await db.collection('clientes')
            .where('telefono', '==', telefono)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('❌ Error al buscar cliente:', error);
        return null;
    }
}

// Obtener clientes activos
async function obtenerClientesActivos() {
    try {
        const snapshot = await db.collection('clientes')
            .where('activo', '==', true)
            .orderBy('nombre')
            .get();

        const clientes = [];
        snapshot.forEach(doc => {
            clientes.push({ id: doc.id, ...doc.data() });
        });
        return clientes;
    } catch (error) {
        console.error('❌ Error al obtener clientes activos:', error);
        return [];
    }
}