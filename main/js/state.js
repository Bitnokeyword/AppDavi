/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
let products   = loadProducts();
let config     = loadConfig();
let tickets    = loadTickets();
let clients    = loadClients();
let lotes      = loadLotes();     // production batches
let rutas      = loadRutas();     // delivery routes
let activeRuta = rutas.find(r=>r.status==='activa') || null;
let queue      = [];
let order      = {};
let counter    = parseInt(localStorage.getItem(KEY_COUNTER) || '1');
let pendingTkt = null;
let histDetailTicket = null;
let currentRole = 'admin' || 'vendor';           // 'admin' | 'vendor'
let authPinBuffer = '';
let authSelectedRole = 'admin';
let qrStream = null;
let qrAnimFrame = null;

/* ═══════════════════════════════════════════════════════
   PERSISTENCE
═══════════════════════════════════════════════════════ */
function loadClients() {
  try { return JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]'); }
  catch { return []; }
}
function saveClients() {
  localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
  syncClientsToFirestore();
}

/* ── Firestore sync — Módulo 2: clientes (mismo patrón que productos) ── */
async function syncClientsToFirestore() {
  if (!window.db) return;
  try {
    const snap = await db.collection('clients').get();
    const remoteIds = snap.docs.map(d => d.id);
    const localIds  = clients.map(c => c.id);
    const batch = db.batch();
    clients.forEach(c => batch.set(db.collection('clients').doc(c.id), c));
    remoteIds
      .filter(id => !localIds.includes(id))
      .forEach(id => batch.delete(db.collection('clients').doc(id)));
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] No se pudo sincronizar clientes:', err);
  }
}

async function loadClientsFromFirestore() {
  if (!window.db) return false;
  try {
    const snap = await db.collection('clients').get();
    if (snap.empty) return false;
    clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
    return true;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar clientes:', err);
    return false;
  }
}

function watchClientsRealtime() {
  if (!window.db) return;
  db.collection('clients').onSnapshot(snap => {
    clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients));
    if (typeof renderClients === 'function' && document.getElementById('clients-grid')) renderClients();
  }, err => console.warn('[Firestore] listener de clientes:', err));
}

function loadProducts() {
  try { const d = JSON.parse(localStorage.getItem(KEY_PRODUCTS)); return d && d.length ? d : DEFAULT_PRODUCTS; }
  catch { return DEFAULT_PRODUCTS; }
}
function saveProducts() {
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
  syncProductsToFirestore();
}

function loadConfig() {
  try { return Object.assign({}, DEFAULT_CONFIG, JSON.parse(localStorage.getItem(KEY_CONFIG) || '{}')); }
  catch { return Object.assign({}, DEFAULT_CONFIG); }
}
function saveConfigData() {
  localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  syncConfigToFirestore();
}

/* ═══════════════════════════════════════════════════════
   FIRESTORE SYNC — Módulo 1: productos + configuración
   ───────────────────────────────────────────────────────
   localStorage sigue siendo la fuente instantánea/offline.
   Si window.db existe (Firebase configurado en firebase-config.js),
   estas funciones además leen/escriben en Firestore y mantienen
   varios dispositivos sincronizados en tiempo real.
═══════════════════════════════════════════════════════ */

/* Sube el arreglo local de productos a Firestore (upsert + borra los que ya no están) */
async function syncProductsToFirestore() {
  if (!window.db) return;
  try {
    const snap = await db.collection('products').get();
    const remoteIds = snap.docs.map(d => d.id);
    const localIds  = products.map(p => p.id);
    const batch = db.batch();
    products.forEach(p => batch.set(db.collection('products').doc(p.id), p));
    remoteIds
      .filter(id => !localIds.includes(id))
      .forEach(id => batch.delete(db.collection('products').doc(id)));
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] No se pudo sincronizar productos:', err);
  }
}

/* Sube la configuración local a Firestore (documento único config/main) */
async function syncConfigToFirestore() {
  if (!window.db) return;
  try { await db.collection('config').doc('main').set(config); }
  catch (err) { console.warn('[Firestore] No se pudo sincronizar configuración:', err); }
}

/* Trae productos de Firestore al arrancar (si hay). Devuelve true si actualizó algo. */
async function loadProductsFromFirestore() {
  if (!window.db) return false;
  try {
    const snap = await db.collection('products').get();
    if (snap.empty) return false;
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
    return true;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar productos:', err);
    return false;
  }
}

/* Trae configuración de Firestore al arrancar (si hay). Devuelve true si actualizó algo. */
async function loadConfigFromFirestore() {
  if (!window.db) return false;
  try {
    const doc = await db.collection('config').doc('main').get();
    if (!doc.exists) return false;
    config = Object.assign({}, DEFAULT_CONFIG, doc.data());
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
    return true;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar configuración:', err);
    return false;
  }
}

/* Escucha cambios de productos en tiempo real (ej. otro dispositivo cambia un precio) */
function watchProductsRealtime() {
  if (!window.db) return;
  db.collection('products').onSnapshot(snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderPriceList === 'function') renderPriceList();
  }, err => console.warn('[Firestore] listener de productos:', err));
}

/* Escucha cambios de configuración en tiempo real */
function watchConfigRealtime() {
  if (!window.db) return;
  db.collection('config').doc('main').onSnapshot(doc => {
    if (!doc.exists) return;
    config = Object.assign({}, DEFAULT_CONFIG, doc.data());
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
    const nameEl = document.getElementById('shop-name-display');
    if (nameEl) nameEl.textContent = config.shopName;
    const cfgNameInp = document.getElementById('cfg-shop-name');
    if (cfgNameInp && typeof loadConfigForm === 'function') loadConfigForm();
  }, err => console.warn('[Firestore] listener de configuración:', err));
}

function loadTickets() {
  try { return JSON.parse(localStorage.getItem(KEY_TICKETS) || '[]'); }
  catch { return []; }
}
function saveTickets() {
  localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
  syncTicketsToFirestore();
}

function saveCounter() {
  localStorage.setItem(KEY_COUNTER, String(counter));
  syncCounterToFirestore();
}

/* ═══════════════════════════════════════════════════════
   FIRESTORE SYNC — Módulo 3: tickets + historial
   ───────────────────────────────────────────────────────
   Los tickets se guardan en la colección 'tickets' usando el
   folio (ej. "F-0001") como id de documento. El contador de
   folio también se sincroniza (colección 'counters', doc
   'main') para reducir folios duplicados entre dispositivos:
   al arrancar y en tiempo real, cada dispositivo adopta el
   valor MÁS ALTO visto (local o remoto). Esto no es 100%
   atómico (dos tickets creados en el mismo instante offline
   en dos equipos podrían repetir folio), pero cubre el caso
   normal de uso secuencial entre vendedores.
═══════════════════════════════════════════════════════ */

/* Sube el arreglo local de tickets a Firestore (upsert + borra los que ya no están) */
async function syncTicketsToFirestore() {
  if (!window.db) return;
  try {
    const snap = await db.collection('tickets').get();
    const remoteIds = snap.docs.map(d => d.id);
    const localIds  = tickets.map(t => t.folio);
    const batch = db.batch();
    tickets.forEach(t => batch.set(db.collection('tickets').doc(t.folio), t));
    remoteIds
      .filter(id => !localIds.includes(id))
      .forEach(id => batch.delete(db.collection('tickets').doc(id)));
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] No se pudo sincronizar tickets:', err);
  }
}

/* Trae tickets de Firestore al arrancar (si hay). Devuelve true si actualizó algo. */
async function loadTicketsFromFirestore() {
  if (!window.db) return false;
  try {
    const snap = await db.collection('tickets').get();
    if (snap.empty) return false;
    tickets = snap.docs.map(d => d.data());
    localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
    return true;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar tickets:', err);
    return false;
  }
}

/* Escucha cambios de tickets en tiempo real (otro vendedor genera/borra un ticket) */
function watchTicketsRealtime() {
  if (!window.db) return;
  db.collection('tickets').onSnapshot(snap => {
    tickets = snap.docs.map(d => d.data());
    localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
    if (typeof renderHistorial === 'function' && document.getElementById('hist-summary')) renderHistorial();
  }, err => console.warn('[Firestore] listener de tickets:', err));
}

/* Marca un ticket como empacado/pendiente de forma atómica (Módulo 4 —
   actualiza solo ese campo en Firestore, sin reescribir todo el arreglo,
   para que dos dispositivos empacando al mismo tiempo no se pisen) */
async function setTicketDone(folio, done) {
  const t = tickets.find(x => x.folio === folio);
  if (t) t.done = done;
  localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
  if (!window.db) return;
  try { await db.collection('tickets').doc(folio).update({ done }); }
  catch (err) { console.warn('[Firestore] No se pudo actualizar estado del ticket:', err); }
}

/* Sube el contador local (solo si es mayor al remoto, para no retroceder) */
async function syncCounterToFirestore() {
  if (!window.db) return;
  try {
    const ref = db.collection('counters').doc('main');
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      const remote = doc.exists ? (doc.data().value || 1) : 1;
      if (counter > remote) tx.set(ref, { value: counter });
    });
  } catch (err) {
    console.warn('[Firestore] No se pudo sincronizar el contador:', err);
  }
}

/* Trae el contador de Firestore al arrancar y adopta el más alto (local vs remoto) */
async function loadCounterFromFirestore() {
  if (!window.db) return false;
  try {
    const doc = await db.collection('counters').doc('main').get();
    if (!doc.exists) return false;
    const remote = doc.data().value || 1;
    if (remote > counter) {
      counter = remote;
      localStorage.setItem(KEY_COUNTER, String(counter));
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar el contador:', err);
    return false;
  }
}

/* Escucha el contador en tiempo real: si otro dispositivo va más adelante, lo adopta */
function watchCounterRealtime() {
  if (!window.db) return;
  db.collection('counters').doc('main').onSnapshot(doc => {
    if (!doc.exists) return;
    const remote = doc.data().value || 1;
    if (remote > counter) {
      counter = remote;
      localStorage.setItem(KEY_COUNTER, String(counter));
    }
  }, err => console.warn('[Firestore] listener de contador:', err));
}

/* Reserva el siguiente folio de forma atómica (Módulo 3 — 100% atómico).
   Con Firebase configurado, usa una transacción de Firestore: lee y sube
   el contador en la MISMA operación, así que si dos vendedores confirman
   un ticket al mismo tiempo, Firestore garantiza que cada uno recibe un
   folio distinto (nunca se pisan). Sin conexión, cae al contador local
   (mismo comportamiento de antes). */
async function getNextFolio() {
  if (window.db) {
    try {
      const ref = db.collection('counters').doc('main');
      const n = await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        const current = doc.exists ? (doc.data().value || 1) : 1;
        const value = Math.max(current, counter);
        tx.set(ref, { value: value + 1 });
        return value;
      });
      counter = n + 1;
      localStorage.setItem(KEY_COUNTER, String(counter));
      return 'F-' + String(n).padStart(4, '0');
    } catch (err) {
      console.warn('[Firestore] No se pudo reservar folio atómico, usando contador local:', err);
    }
  }
  const folio = 'F-' + String(counter).padStart(4, '0');
  counter++;
  saveCounter();
  return folio;
}

/* Genera un id único (Módulo 5). Si Firebase está cargado, usa el
   generador de ids de Firestore (.doc().id) — es local/instantáneo, no
   necesita internet, y es prácticamente imposible que choque entre
   dispositivos. Sin Firebase, cae a timestamp + azar. */
function generateUniqueId(prefix) {
  if (window.db) {
    try { return prefix + '-' + db.collection('_ids').doc().id; }
    catch (err) { /* sigue al fallback */ }
  }
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function loadLotes() { try { return JSON.parse(localStorage.getItem(KEY_LOTES) || '[]'); } catch { return []; } }
function saveLotes() {
  localStorage.setItem(KEY_LOTES, JSON.stringify(lotes));
  syncLotesToFirestore();
}

/* ── Firestore sync — Módulo 5: producción / lotes (mismo patrón que productos) ── */
async function syncLotesToFirestore() {
  if (!window.db) return;
  try {
    const snap = await db.collection('lotes').get();
    const remoteIds = snap.docs.map(d => d.id);
    const localIds  = lotes.map(l => l.id);
    const batch = db.batch();
    lotes.forEach(l => batch.set(db.collection('lotes').doc(l.id), l));
    remoteIds
      .filter(id => !localIds.includes(id))
      .forEach(id => batch.delete(db.collection('lotes').doc(id)));
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] No se pudo sincronizar lotes:', err);
  }
}
async function loadLotesFromFirestore() {
  if (!window.db) return false;
  try {
    const snap = await db.collection('lotes').get();
    if (snap.empty) return false;
    lotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(KEY_LOTES, JSON.stringify(lotes));
    return true;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar lotes:', err);
    return false;
  }
}
function watchLotesRealtime() {
  if (!window.db) return;
  db.collection('lotes').onSnapshot(snap => {
    lotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(KEY_LOTES, JSON.stringify(lotes));
    if (typeof renderStockGrid === 'function' && document.getElementById('stock-grid')) renderStockGrid();
    if (typeof renderLoteHistory === 'function' && document.getElementById('lote-history')) renderLoteHistory();
  }, err => console.warn('[Firestore] listener de lotes:', err));
}

function loadRutas() { try { return JSON.parse(localStorage.getItem(KEY_RUTAS) || '[]'); } catch { return []; } }
function saveRutas() {
  localStorage.setItem(KEY_RUTAS, JSON.stringify(rutas));
  syncRutasToFirestore();
}
/* Guarda solo localStorage, sin disparar el mirror completo — se usa junto
   con las actualizaciones atómicas de abajo (arrayUnion), para no pisar
   ese cambio con una reescritura completa del arreglo. */
function saveRutasLocalOnly() {
  localStorage.setItem(KEY_RUTAS, JSON.stringify(rutas));
}

/* ── Firestore sync — Módulo 6: rutas (mismo patrón que productos) ── */
async function syncRutasToFirestore() {
  if (!window.db) return;
  try {
    const snap = await db.collection('rutas').get();
    const remoteIds = snap.docs.map(d => d.id);
    const localIds  = rutas.map(r => r.id);
    const batch = db.batch();
    rutas.forEach(r => batch.set(db.collection('rutas').doc(r.id), r));
    remoteIds
      .filter(id => !localIds.includes(id))
      .forEach(id => batch.delete(db.collection('rutas').doc(id)));
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] No se pudo sincronizar rutas:', err);
  }
}
async function loadRutasFromFirestore() {
  if (!window.db) return false;
  try {
    const snap = await db.collection('rutas').get();
    if (snap.empty) return false;
    rutas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    activeRuta = rutas.find(r => r.status === 'activa') || null;
    localStorage.setItem(KEY_RUTAS, JSON.stringify(rutas));
    return true;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar rutas:', err);
    return false;
  }
}
function watchRutasRealtime() {
  if (!window.db) return;
  db.collection('rutas').onSnapshot(snap => {
    rutas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    activeRuta = rutas.find(r => r.status === 'activa') || null;
    localStorage.setItem(KEY_RUTAS, JSON.stringify(rutas));
    if (typeof renderRutas === 'function' && document.getElementById('ruta-status-txt')) renderRutas();
  }, err => console.warn('[Firestore] listener de rutas:', err));
}

/* Registra una visita de forma 100% atómica (Módulo 6). Usa arrayUnion de
   Firestore, que el servidor combina de forma segura aunque dos
   dispositivos escaneen el QR de dos clientes distintos en el mismo
   instante sobre la misma ruta — a diferencia de un guardado de arreglo
   completo, aquí nunca se pierde una visita por una condición de carrera. */
async function atomicAddVisita(rutaId, clientId) {
  if (!window.db) return;
  try {
    await db.collection('rutas').doc(rutaId).set({
      visitados: firebase.firestore.FieldValue.arrayUnion(clientId)
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] No se pudo registrar la visita de forma atómica:', err);
  }
}
/* Vincula un ticket a la ruta activa de forma 100% atómica (arrayUnion) */
async function atomicAddTicketToRuta(rutaId, folio) {
  if (!window.db) return;
  try {
    await db.collection('rutas').doc(rutaId).set({
      tickets: firebase.firestore.FieldValue.arrayUnion(folio)
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] No se pudo vincular el ticket de forma atómica:', err);
  }
}

function loadAuth() { try { return JSON.parse(localStorage.getItem(KEY_AUTH) || '{}'); } catch { return {}; } }
function saveAuth(d) {
  localStorage.setItem(KEY_AUTH, JSON.stringify(d));
  syncAuthToFirestore(d);
}

/* ═══════════════════════════════════════════════════════
   FIRESTORE SYNC — Módulo 8: auth (PIN de administrador)
   ───────────────────────────────────────────────────────
   ⚠️ El hash del PIN queda en la colección 'auth'. Antes de
   usar esto en producción, protege esa colección con reglas
   de Firestore que exijan autenticación (ver README) — con
   reglas abiertas de "modo prueba", cualquiera podría leer
   el hash del PIN.
═══════════════════════════════════════════════════════ */
async function syncAuthToFirestore(d) {
  if (!window.db) return;
  try { await db.collection('auth').doc('main').set(d, { merge: true }); }
  catch (err) { console.warn('[Firestore] No se pudo sincronizar el PIN de admin:', err); }
}
async function loadAuthFromFirestore() {
  if (!window.db) return false;
  try {
    const doc = await db.collection('auth').doc('main').get();
    if (!doc.exists) return false;
    const remote = doc.data();
    if (remote && remote.adminPinHash) {
      localStorage.setItem(KEY_AUTH, JSON.stringify(remote));
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Firestore] No se pudo cargar el PIN de admin:', err);
    return false;
  }
}

/* SHA-256 via Web Crypto (async, returns hex string) */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

