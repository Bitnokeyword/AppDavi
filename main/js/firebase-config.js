/* ═══════════════════════════════════════════════════════
   FIREBASE CONFIG — plantilla lista para usar
   ───────────────────────────────────────────────────────
   1. Ve a https://console.firebase.google.com → tu proyecto
      → ⚙️ Configuración del proyecto → "Tus apps" → Web (</>)
   2. Copia el objeto firebaseConfig que te da Firebase y
      pégalo abajo, reemplazando el objeto de ejemplo.
   3. Si aún NO tienes proyecto de Firebase, este archivo no
      rompe nada: la app sigue funcionando 100% con
      localStorage como hasta ahora (modo offline actual).
   4. Cuando quieras migrar datos (productos, tickets,
      clientes, etc.) de localStorage a Firestore, se hace
      módulo por módulo — este archivo solo deja la conexión
      lista para ese siguiente paso.
═══════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyCFGYth-CoiTgZKIs2yApdVeGETizUzBfQ",
  authDomain: "productos-de-la-costa.firebaseapp.com",
  databaseURL: "https://productos-de-la-costa-default-rtdb.firebaseio.com",
  projectId: "productos-de-la-costa",
  storageBucket: "productos-de-la-costa.firebasestorage.app",
  messagingSenderId: "491016634165",
  appId: "1:491016634165:web:edd8277b3f80ccf2f6967c"
};

let firebaseApp = null;
let db   = null;   // Firestore (si decides migrar del localStorage)
let auth = null;   // Firebase Auth (si decides usarlo en vez del PIN local)

(function initFirebase() {
  // Si no cargó el SDK de Firebase (script comentado en index.html), no hace nada
  if (!window.firebase) {
    console.log('[Firebase] SDK no cargado — la app sigue usando localStorage.');
    window.firebaseReady = Promise.resolve();
    return;
  }
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    db   = firebase.firestore();
    auth = firebase.auth();
    window.firebaseApp = firebaseApp;
    window.db   = db;
    window.auth = auth;
    console.log('[Firebase] Conectado correctamente ✅');

    // Inicia sesión anónima para que las reglas de Firestore puedan exigir
    // "request.auth != null" — así ya no queda abierto a cualquiera en
    // internet, solo a quien cargue tu app. init.js espera esta promesa
    // antes de leer/escribir en Firestore, para evitar errores de permisos.
    window.firebaseReady = auth.signInAnonymously()
      .then(() => console.log('[Firebase] Sesión anónima iniciada ✅'))
      .catch(err => console.warn('[Firebase] No se pudo iniciar sesión anónima:', err));
  } catch (err) {
    console.warn('[Firebase] Error al inicializar:', err);
    window.firebaseReady = Promise.resolve();
  }
})();
