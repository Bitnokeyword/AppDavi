/* ═══════════════════════════════════════════════════════
   UPDATED FUNCTIONS
═══════════════════════════════════════════════════════ */

/* Override goTab to handle new tabs + role guard */
function goTab(name) {
  const adminTabs = ['produccion','rutas','admin'];
  if (adminTabs.includes(name) && currentRole !== 'admin') {
    toast('⛔ Acceso solo para administrador','warn'); return;
  }
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
  const panel = document.getElementById('panel-'+name);
  if (!panel) return;
  panel.classList.add('active');

  // Find and activate nav tab by matching onclick
  document.querySelectorAll('.nav-tab').forEach(b => {
    if (b.getAttribute('onclick') === `goTab('${name}')`) b.classList.add('active');
  });

  if (name==='acomodador') renderAcomodador();
  if (name==='historial')  renderHistorial();
  if (name==='clientes')   renderClients();
  if (name==='produccion') { renderStockGrid(); renderLoteForm(); renderLoteHistory(); }
  if (name==='rutas')      renderRutas();
  if (name==='admin')      { renderPriceList(); loadConfigForm(); }
}



