// ============================================
// 🔐 FIREBASE AUTH - Funciones
// ============================================

// ===== INICIAR SESIÓN =====
async function loginFirebase(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Obtener el rol del usuario desde Firestore
        const userDoc = await db.collection(COLECCIONES.USUARIOS).doc(user.uid).get();
        const userData = userDoc.data();
        
        if (userData) {
            // Guardar rol en localStorage para uso rápido
            localStorage.setItem('userRole', userData.rol);
            localStorage.setItem('userName', userData.nombre);
            localStorage.setItem('userId', user.uid);
            
            return {
                success: true,
                user: user,
                rol: userData.rol,
                nombre: userData.nombre
            };
        } else {
            // Si el usuario no tiene datos, crear registro
            await crearUsuarioFirebase(user.uid, user.email, 'vendedor', user.displayName || 'Usuario');
            localStorage.setItem('userRole', 'vendedor');
            localStorage.setItem('userName', user.displayName || 'Usuario');
            localStorage.setItem('userId', user.uid);
            
            return {
                success: true,
                user: user,
                rol: 'vendedor',
                nombre: user.displayName || 'Usuario'
            };
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ===== CREAR USUARIO EN FIRESTORE =====
async function crearUsuarioFirebase(uid, email, rol = 'vendedor', nombre = 'Usuario') {
    try {
        await db.collection(COLECCIONES.USUARIOS).doc(uid).set({
            email: email,
            nombre: nombre,
            rol: rol,
            activo: true,
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Usuario creado en Firestore');
        return { success: true };
    } catch (error) {
        console.error('❌ Error al crear usuario:', error);
        return { success: false, error: error.message };
    }
}

// ===== CERRAR SESIÓN =====
async function logoutFirebase() {
    try {
        await auth.signOut();
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
        return { success: true };
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        return { success: false, error: error.message };
    }
}

// ===== VERIFICAR SESIÓN =====
function verificarSesion(roleRequired = null) {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (roleRequired && userRole !== roleRequired) {
        alert('⛔ No tienes permisos para acceder a esta sección.');
        window.location.href = userRole === 'admin' ? 'admin.html' : 'vendedor.html';
        return false;
    }
    
    return true;
}

// ===== ESCUCHAR CAMBIOS DE AUTENTICACIÓN =====
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario autenticado
        console.log('👤 Usuario autenticado:', user.email);
    } else {
        // Usuario no autenticado
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'index.html') {
            console.log('🔒 Usuario no autenticado, redirigiendo...');
            window.location.href = 'index.html';
        }
    }
});

// ===== REGISTRAR NUEVO USUARIO =====
async function registrarUsuario(email, password, nombre, rol = 'vendedor') {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Actualizar perfil
        await user.updateProfile({
            displayName: nombre
        });
        
        // Crear documento en Firestore
        await crearUsuarioFirebase(user.uid, email, rol, nombre);
        
        localStorage.setItem('userRole', rol);
        localStorage.setItem('userName', nombre);
        localStorage.setItem('userId', user.uid);
        
        return {
            success: true,
            user: user,
            rol: rol,
            nombre: nombre
        };
    } catch (error) {
        console.error('❌ Error en registro:', error);
        return {
            success: false,
            error: error.message
        };
    }
}