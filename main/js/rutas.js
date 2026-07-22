/* ═══════════════════════════════════════════════════════
   RUTAS MODULE
   - Prepara inventario de salida por ruta
   - Asigna clientes geográficamente
   - Vendedor escanea QR al llegar a cada punto
   - Cierra ruta y calcula sobrante
   - Metadatos GPS en cada ticket
═══════════════════════════════════════════════════════ */

function renderRutas() {
  renderRutaStatus();
  renderRutasHistory();
}

function renderRutaStatus() {
  const statusTxt  = document.getElementById('ruta-status-txt');
  const btnNueva   = document.getElementById('btn-nueva-ruta');
  const btnCerrar  = document.getElementById('btn-cerrar-ruta');
  const invSection = document.getElementById('ruta-inv-section');
  if (!statusTxt) return;

  if (activeRuta) {
    const vendedor = activeRuta.vendedor || 'Vendedor';
    const visited  = activeRuta.visitados?.length || 0;
    const total    = activeRuta.clientesAsignados?.length || 0;
    statusTxt.className = 'ruta-status-active';
    statusTxt.textContent = `🚚 Ruta activa — ${vendedor} · ${visited}/${total} visitas`;
    if (btnNueva)  btnNueva.style.display  = 'none';
    if (btnCerrar) btnCerrar.style.display = '';
    if (invSection) {
      invSection.style.display = '';
      renderRutaInv();
      renderRutaClients();
    }
  } else {
    statusTxt.className   = 'ruta-status-none';
    statusTxt.textContent = 'Sin ruta activa hoy.';
    if (btnNueva)  btnNueva.style.display  = '';
    if (btnCerrar) btnCerrar.style.display = 'none';
    if (invSection) invSection.style.display = 'none';
  }
}

function renderRutaInv() {
  const grid = document.getElementById('ruta-inv-grid');
  if (!grid || !activeRuta) return;
  const pm = getProductMap();
  grid.innerHTML = (activeRuta.inventarioInicial || []).map(item => {
    const p    = pm[item.productId];
    const sold = (activeRuta.tickets || []).reduce((s, tid) => {
      const t = tickets.find(x=>x.folio===tid);
      if (!t) return s;
      const ti = t.items.find(i=>i.id===item.productId);
      return s + (ti ? ti.qty : 0);
    }, 0);
    const rem = Math.max(0, item.qty - sold);
    return `<div class="ruta-inv-row">
      <div><div class="ri-name">${p ? p.name : item.productId}</div>
           <div class="ri-sold">Vendido: ${sold}</div></div>
      <div class="ri-qty">${rem}</div>
    </div>`;
  }).join('') || '<p style="color:var(--muted);font-size:.82rem">Sin inventario asignado.</p>';
}

function renderRutaClients() {
  const list = document.getElementById('ruta-client-list');
  if (!list || !activeRuta) return;
  const visitados = activeRuta.visitados || [];
  const clientIds = activeRuta.clientesAsignados || [];
  list.innerHTML = clientIds.map(cid => {
    const c   = clients.find(x=>x.id===cid);
    if (!c) return '';
    const vis = visitados.includes(cid);
    return `<div class="visit-card ${vis ? 'visited' : 'pending'}">
      <div style="flex:1">
        <div class="vc-name">${c.name}</div>
        <div class="vc-addr">${c.address||c.phone||''}</div>
      </div>
      ${c.lat && c.lng ? `<a href="https://maps.google.com/?q=${c.lat},${c.lng}" target="_blank" class="btn btn-ghost btn-sm">📍 Mapa</a>` : ''}
      ${vis
        ? `<span class="vc-status-visited">✅ Visitado</span>`
        : `<button class="btn btn-teal btn-sm" onclick="marcarVisita('${cid}')">Marcar visita</button>`}
    </div>`;
  }).join('') || '<p style="color:var(--muted);font-size:.82rem">Sin clientes asignados.</p>';
}

function renderRutasHistory() {
  const el = document.getElementById('rutas-history');
  if (!el) return;
  const cerradas = [...rutas].filter(r=>r.status==='cerrada').reverse().slice(0,10);
  if (!cerradas.length) { el.innerHTML = '<p style="color:var(--muted);font-size:.82rem">Sin rutas anteriores.</p>'; return; }
  el.innerHTML = cerradas.map(r => {
    const total = (r.tickets||[]).reduce((s,tid) => {
      const t = tickets.find(x=>x.folio===tid);
      return s + (t ? t.total : 0);
    }, 0);
    return `<div class="lote-card">
      <div class="lote-card-head">
        <span class="lote-id">🗺️ ${r.id}</span>
        <span class="lote-date">${r.dateStr} · ${r.vendedor}</span>
        <span style="font-family:var(--font-display);color:var(--rose)">$${total}</span>
      </div>
      <div style="font-size:.76rem;color:var(--muted)">${(r.visitados||[]).length}/${(r.clientesAsignados||[]).length} clientes · ${(r.tickets||[]).length} tickets</div>
    </div>`;
  }).join('');
}

function openNuevaRuta() {
  // Build inventory assignment form
  const invForm = document.getElementById('nr-inv-form');
  if (invForm) {
    invForm.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">` +
      products.map(p => `<div class="lote-row">
        <div class="lote-row-name">${p.name}</div>
        <div style="font-size:.72rem;color:var(--muted)">Stock: ${getStock(p.id)}</div>
        <input class="lote-qty-inp" type="number" min="0" value="0" id="nr-${p.id}" style="width:60px">
      </div>`).join('') + '</div>';
  }
  // Build clients checklist
  const cForm = document.getElementById('nr-clients-form');
  if (cForm) {
    cForm.innerHTML = clients.length
      ? clients.map(c => `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--cream-100);border-radius:6px;cursor:pointer;font-size:.82rem">
          <input type="checkbox" id="nrc-${c.id}" style="width:16px;height:16px">
          <span>${c.name}</span>
          ${c.address ? `<span style="color:var(--muted);font-size:.72rem"> · ${c.address}</span>` : ''}
        </label>`).join('')
      : '<p style="color:var(--muted);font-size:.82rem">Sin clientes registrados aún.</p>';
  }
  openModal('modal-nueva-ruta');
}

function iniciarRuta() {
  const vendedor = (document.getElementById('nr-vendedor').value||'').trim();
  if (!vendedor) { toast('Ingresa el nombre del vendedor','warn'); return; }

  const inventarioInicial = products.map(p => {
    const inp = document.getElementById('nr-' + p.id);
    const qty = parseInt(inp?.value || 0);
    return { productId: p.id, qty };
  }).filter(i => i.qty > 0);

  const clientesAsignados = clients
    .filter(c => document.getElementById('nrc-' + c.id)?.checked)
    .map(c => c.id);

  const ruta = {
    // Antes: 'R-' + fecha (sin hora) → dos rutas el mismo día generaban
    // el MISMO id y se pisaban entre sí en historial/exportaciones.
    // Ahora usamos timestamp completo, que es único por milisegundo.
    id:                 'R-' + Date.now(),
    date:               new Date().toISOString(),
    dateStr:            new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}),
    vendedor,
    inventarioInicial,
    clientesAsignados,
    visitados:          [],
    tickets:            [],
    status:             'activa',
  };

  rutas.push(ruta);
  activeRuta = ruta;
  saveRutas();
  closeModal('modal-nueva-ruta');
  renderRutaStatus();
  toast(`✓ Ruta ${ruta.id} iniciada — ${clientesAsignados.length} clientes`, 'success');
}

function marcarVisita(clientId) {
  if (!activeRuta) return;
  if (!activeRuta.visitados) activeRuta.visitados = [];
  if (!activeRuta.visitados.includes(clientId)) {
    activeRuta.visitados.push(clientId);
    saveRutasLocalOnly();
    atomicAddVisita(activeRuta.id, clientId);
    renderRutaClients();
    updateBadge();
    const c = clients.find(x=>x.id===clientId);
    toast(`✓ Visita registrada: ${c?.name || clientId}`,'success');
  }
}

function cerrarRuta() {
  if (!activeRuta) return;
  if (!confirm(`¿Cerrar la ruta ${activeRuta.id}?\n\nEl inventario sobrante volverá al stock.`)) return;
  activeRuta.status    = 'cerrada';
  activeRuta.closedAt  = new Date().toISOString();
  // Sobrante: inventario inicial - vendido en ruta
  activeRuta.sobrante  = (activeRuta.inventarioInicial || []).map(item => {
    const sold = (activeRuta.tickets || []).reduce((s, tid) => {
      const t = tickets.find(x=>x.folio===tid);
      if (!t) return s;
      const ti = t.items.find(i=>i.id===item.productId);
      return s + (ti ? ti.qty : 0);
    }, 0);
    return { productId: item.productId, qty: Math.max(0, item.qty - sold) };
  });
  saveRutas();
  activeRuta = null;
  renderRutaStatus();
  renderRutasHistory();
  toast('Ruta cerrada. Sobrante reintegrado al inventario.', 'success');
}

/* Link ticket to active ruta */
function linkTicketToRuta(folio, clientId) {
  if (!activeRuta) return;
  if (!activeRuta.tickets) activeRuta.tickets = [];
  activeRuta.tickets.push(folio);
  if (clientId && !activeRuta.visitados?.includes(clientId)) {
    if (!activeRuta.visitados) activeRuta.visitados = [];
    activeRuta.visitados.push(clientId);
  }
  saveRutasLocalOnly();
  atomicAddTicketToRuta(activeRuta.id, folio);
  if (clientId) atomicAddVisita(activeRuta.id, clientId);
}

