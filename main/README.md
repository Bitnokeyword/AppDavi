# POS App — versión modular

Este proyecto es el mismo sistema POS que tenías en un solo archivo HTML
(`v2_qrincluido__CORREGIDO.html`), separado en módulos para poder
desplegarlo en Vercel y dejarlo listo para conectar Firebase.

## Estructura

```
pos-app/
├── index.html            ← esqueleto HTML + paneles + modales
├── css/
│   └── styles.css        ← todos los estilos (tokens, header, nav, cards, etc.)
├── js/
│   ├── firebase-config.js  ← NUEVO: plantilla para tu config de Firebase
│   ├── config.js            (storage keys + catálogo/config por defecto)
│   ├── state.js             (variables de estado + persistencia localStorage)
│   ├── products.js          (grid de productos + manejo de pedido)
│   ├── tickets.js           (generación/impresión/envío de tickets)
│   ├── acomodador.js        (cola de pedidos)
│   ├── historial.js         (historial de ventas)
│   ├── admin.js              (panel Administrar: precios/config/PIN)
│   ├── clientes.js          (directorio de clientes)
│   ├── auth.js              (login por PIN / roles)
│   ├── produccion.js        (inventario y lotes)
│   ├── rutas.js              (rutas de entrega)
│   ├── gps.js                (geolocalización)
│   ├── qr-scanner.js        (escaneo de QR de clientes)
│   ├── navigation.js        (goTab — navegación entre pestañas)
│   ├── qr-generation.js     (generación/impresión de QR por cliente)
│   ├── helpers.js            (toasts, modales, descarga de archivos)
│   ├── init.js                (arranque de la app)
│   └── sw-register.js       (Service Worker para modo offline)
├── vercel.json
└── package.json
```

El orden de los `<script>` en `index.html` respeta las dependencias
originales — no lo cambies al editar.

## Desplegar en Vercel

**Opción A — desde el navegador (sin instalar nada, ideal desde Android):**
1. Sube esta carpeta a un repo de GitHub (puedes arrastrar el zip
   descomprimido en github.com → "Add file" → "Upload files").
2. Entra a [vercel.com](https://vercel.com) → "Add New Project" → importa
   el repo → Framework Preset: **Other** (es HTML estático, no necesita build).
3. Deploy. Listo, no requiere variables de entorno para funcionar como está.

**Opción B — CLI (si tienes Node/Termux con `npx` disponible):**
```bash
npx vercel --prod
```

## Conectar Firebase (cuando estés listo)

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. En "Configuración del proyecto → Tus apps → Web", copia el objeto
   `firebaseConfig`.
3. Pégalo en `js/firebase-config.js`, reemplazando el objeto de ejemplo.
4. El SDK de Firebase ya está activo en `index.html` (3 `<script>` de
   `gstatic.com` + `js/firebase-config.js`).
5. Mientras `firebaseConfig` no tenga credenciales reales, **la app sigue
   funcionando igual que ahora**, 100% con `localStorage` — nada se rompe.

## Reglas de Firestore para producción (antes de compartir la URL con tu cliente)

Ya no uses las reglas de "modo prueba" — quedan abiertas a cualquiera en
internet. Sigue estos pasos, en este orden (el orden importa):

1. **Activa el inicio de sesión anónimo** en Firebase Console:
   Authentication → Sign-in method → Anonymous → Habilitar.
   ⚠️ Si saltas este paso, la app dejará de poder leer/escribir en
   Firestore en cuanto pongas las reglas del punto 2 (se quedaría "colgada"
   mostrando datos viejos de localStorage, sin sincronizar).
2. Copia el contenido de `firestore.rules` (en la raíz del proyecto) y
   pégalo en Firebase Console → Firestore Database → Reglas → Publicar.
3. Recarga la app (dos veces si tenías una pestaña abierta de antes) y
   revisa la consola del navegador: deberías ver
   `[Firebase] Sesión anónima iniciada ✅`.

Esto bloquea el acceso a quien no pase por tu app, pero **no separa admin
de vendedor** — ambos roles comparten el mismo nivel de acceso a Firestore
por ahora, porque esa distinción vive solo en el PIN local, no en Firebase
Auth. Si más adelante quieres esa separación real, se puede hacer con
Firebase Auth (correo/contraseña o teléfono) + "custom claims" por rol —
es un cambio más grande que conviene planear con calma, no de última hora.

## Progreso de la migración a Firestore

- [x] **Módulo 1 — `config.js` / `state.js`**: productos y configuración del
      negocio ya sincronizan con Firestore (colección `products`, documento
      `config/main`).
- [x] **Módulo 2 — `clientes.js` / `state.js`**: clientes ya sincronizan con
      Firestore (colección `clients`), mismo patrón de upsert+borrado y
      listener en tiempo real. `firebase-config.js` ya trae las credenciales
      reales del proyecto `productos-de-la-costa`.
      ⚠️ Se corrigió un bug: la comparación que detectaba "config de
      ejemplo" quedó comparando tu API key contra sí misma (el placeholder
      fue reemplazado también dentro de la condición), lo que hubiera
      impedido que Firebase se inicializara. Ahora solo valida que el SDK
      haya cargado.
- [x] **Módulo 3 — `tickets.js` + `historial.js` / `state.js`**: tickets ya
      sincronizan con Firestore (colección `tickets`, doc id = folio, ej.
      `F-0001`), con upsert+borrado y listener en tiempo real.
      ✅ **Folio 100% atómico**: `getNextFolio()` usa una transacción de
      Firestore (`runTransaction`) que lee y sube el contador en la misma
      operación — si dos vendedores confirman un ticket al mismo tiempo,
      Firestore garantiza que cada uno recibe un folio distinto. Sin
      conexión, cae al contador local (igual que antes).
- [x] **Módulo 4 — `acomodador.js`**: la cola (`queue`) sigue siendo de la
      sesión actual (como antes), pero ahora marcar/deshacer "Listo"
      (`qDone`/`qUndo`) persiste el campo `done` directo en el documento del
      ticket en Firestore (`setTicketDone()` en `state.js`) — atómico por
      diseño, ya que solo toca ese campo de ese documento, sin reescribir
      todo el arreglo de tickets.
- [x] **Módulo 5 — `produccion.js`**: lotes sincronizan con Firestore
      (colección `lotes`). Los ids de lote y de ajustes rápidos ahora usan
      `generateUniqueId()`, que aprovecha el generador de ids de Firestore
      (`.doc().id`, local e instantáneo) en vez de `lotes.length` — así dos
      dispositivos nunca generan el mismo id de lote.
- [x] **Módulo 6 — `rutas.js`**: rutas sincronizan con Firestore (colección
      `rutas`). ✅ **Visitas y tickets vinculados 100% atómicos**:
      `marcarVisita()` y `linkTicketToRuta()` usan
      `FieldValue.arrayUnion()` de Firestore en vez de reescribir el
      arreglo completo — así, si dos vendedores escanean QRs de la misma
      ruta casi al mismo tiempo, ninguna visita se pierde por una condición
      de carrera (a diferencia de un guardado de arreglo completo, donde el
      último en guardar "gana" y pisa al otro).
- [x] **Módulo 7 — `qr-generation.js` + `qr-scanner.js`**: no necesitaron
      cambios — ya leen directamente de `clients`, que sincroniza desde el
      Módulo 2.
- [x] **Módulo 8 — `auth.js`**: el hash del PIN de administrador sincroniza
      con Firestore (colección `auth`, doc `main`), para que cambiar el PIN
      desde un dispositivo lo actualice en todos.
      ⚠️ **Importante**: mientras uses las reglas de "modo prueba" (abajo),
      cualquiera con la URL de tu proyecto podría leer ese hash. Antes de
      usar esto con datos reales de clientes, cambia las reglas de
      Firestore para exigir autenticación — al menos para la colección
      `auth`, e idealmente para todas.

### Cómo probarlo
1. En Firebase Console → Firestore Database, crea la base en **modo de
   prueba** por ahora (reglas abiertas mientras desarrollas):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true; // ⚠️ solo para desarrollo
       }
     }
   }
   ```
   Antes de usarlo con clientes reales, cambia esto por reglas que exijan
   autenticación real (Firebase Auth), no solo el PIN local actual.
2. Abre la app en dos pestañas o dos dispositivos distintos: cambia un
   precio, agrega un cliente, genera un ticket, registra un lote, o marca
   una visita en una ruta — debería reflejarse solo en el otro dispositivo
   gracias a los listeners `watch*Realtime()` en `state.js`.
3. Para probar la atomicidad del folio: abre la app en dos pestañas, ambas
   con productos en el carrito, y da clic en "Generar ticket" casi al mismo
   tiempo en las dos — deberían salir con folios consecutivos distintos,
   nunca repetidos.

### Migración completa
Los 8 módulos ya sincronizan con Firestore (productos, clientes, tickets,
historial, acomodador, producción, rutas y auth), manteniendo `localStorage`
como caché instantánea y respaldo offline en todos los casos. Las
operaciones con riesgo real de choque entre dispositivos (folio de ticket,
visitas de ruta) usan transacciones o `arrayUnion` de Firestore para ser
atómicas de verdad, no solo "el último que guarda gana".

Pendiente para cuando quieras (fuera de esta migración): mover el PIN de
administrador a Firebase Auth en vez de un hash compartido, y definir
reglas de Firestore por rol (admin vs vendedor) en vez de reglas abiertas
de modo prueba.
