/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
(async function boot() {
  // Apply shop name everywhere (versión instantánea desde localStorage/caché)
  document.getElementById('shop-name-display').textContent = config.shopName;
  const authTitle = document.getElementById('auth-shop-title');
  if (authTitle) authTitle.textContent = config.shopName;

  // Render products and summary (con lo que ya había en localStorage, para que
  // la app se vea de inmediato aunque no haya internet)
  renderProducts();
  refreshSummary();
  updateBadge();

  // Add QR scan button to sidebar
  addQRButtonToSidebar();

  // Si Firebase está configurado (window.db existe), trae la versión más
  // reciente de productos/configuración desde Firestore y activa la
  // sincronización en tiempo real entre dispositivos. Si no está
  // configurado, todo sigue igual que antes (100% localStorage).
  // Espera a que Firebase termine de iniciar sesión (anónima) antes de
  // tocar Firestore, para evitar errores de permisos por condición de carrera.
  if (window.firebaseReady) await window.firebaseReady;

  if (window.db) {
    const [gotProducts, gotConfig, gotClients, gotTickets, gotCounter, gotLotes, gotRutas, gotAuth] = await Promise.all([
      loadProductsFromFirestore(),
      loadConfigFromFirestore(),
      loadClientsFromFirestore(),
      loadTicketsFromFirestore(),
      loadCounterFromFirestore(),
      loadLotesFromFirestore(),
      loadRutasFromFirestore(),
      loadAuthFromFirestore()
    ]);
    if (gotProducts) { renderProducts(); refreshSummary(); }
    if (gotConfig) {
      document.getElementById('shop-name-display').textContent = config.shopName;
      if (authTitle) authTitle.textContent = config.shopName;
    }
    if (gotClients && document.getElementById('clients-grid')) renderClients();
    if (gotTickets && document.getElementById('hist-summary')) renderHistorial();
    if (gotLotes && document.getElementById('stock-grid')) renderStockGrid();
    if (gotRutas && document.getElementById('ruta-status-txt')) renderRutas();
    watchProductsRealtime();
    watchConfigRealtime();
    watchClientsRealtime();
    watchTicketsRealtime();
    watchCounterRealtime();
    watchLotesRealtime();
    watchRutasRealtime();
  }

  // Try to resume previous session (e.g. page refresh)
  // If no saved session, show auth screen
  if (!resumeSession()) {
    const screen = document.getElementById('auth-screen');
    if (screen) screen.style.display = 'flex';
  }

  // Pre-warm GPS permission (silent request so first ticket is faster)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 2000 });
  }
})();
