/* ═══════════════════════════════════════════════════════
   PRODUCCIÓN MODULE
   - Registra lotes por SKU (producto + presentación)
   - Actualiza stock en tiempo real
   - Descuenta stock automáticamente al generar ticket
   - Alerta cuando stock < minStock
═══════════════════════════════════════════════════════ */

function getStock(productId) {
  const auth = loadLotes();
  // Sum all lotes produced minus all ticket sales
  const produced = lotes.reduce((s, l) => {
    const item = l.items.find(i=>i.productId===productId);
    return s + (item ? item.qty : 0);
  }, 0);
  const sold = tickets.reduce((s, t) => {
    const item = t.items.find(i=>i.id===productId);
    return s + (item ? item.qty : 0);
  }, 0);
  return Math.max(0, produced - sold);
}

function renderStockGrid() {
  const grid = document.getElementById('stock-grid');
  if (!grid) return;
  if (!products.length) { grid.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Sin productos configurados.</p>'; return; }
  grid.innerHTML = products.map(p => {
    const stock = getStock(p.id);
    const min   = p.minStock || 10;
    const cls   = stock === 0 ? 'zero' : stock <= min ? 'low' : '';
    const size  = p.size ? ` · ${p.size}` : '';
    return `<div class="stock-card ${cls}">
      <div class="sc-size">${p.cat}${size}</div>
      <div class="sc-name">${p.name}</div>
      <div class="sc-stock">${stock}</div>
      <div class="sc-label">unidades disponibles</div>
      <div class="sc-actions">
        <button class="btn btn-ghost btn-sm" onclick="quickAdjust('${p.id}',1)">+1</button>
        <button class="btn btn-ghost btn-sm" onclick="quickAdjust('${p.id}',-1)">−1</button>
      </div>
    </div>`;
  }).join('');
}

function renderLoteForm() {
  const form = document.getElementById('lote-items-form');
  if (!form) return;
  form.innerHTML = products.map(p => {
    const size = p.size ? ` (${p.size})` : '';
    return `<div class="lote-row">
      <div class="lote-row-name">${p.name}${size}</div>
      <div class="lote-row-size">${p.cat}</div>
      <input class="lote-qty-inp" type="number" min="0" value="0"
             id="lq-${p.id}" placeholder="0">
    </div>`;
  }).join('');
}

function clearLoteForm() {
  products.forEach(p => {
    const inp = document.getElementById('lq-' + p.id);
    if (inp) inp.value = 0;
  });
}

function saveLote() {
  const items = products.map(p => {
    const inp = document.getElementById('lq-' + p.id);
    const qty = parseInt(inp?.value || 0);
    return { productId: p.id, qty };
  }).filter(i => i.qty > 0);

  if (!items.length) { toast('Ingresa al menos una cantidad','warn'); return; }

  const lote = {
    id:     generateUniqueId('L'),
    date:   new Date().toISOString(),
    dateStr:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}),
    timeStr:new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}),
    registradoPor: currentRole || 'admin',
    items
  };

  lotes.push(lote);
  saveLotes();
  clearLoteForm();
  renderStockGrid();
  renderLoteHistory();
  toast(`✓ Lote ${lote.id} registrado — ${items.reduce((s,i)=>s+i.qty,0)} unidades`, 'success');

  // Check low stock alerts
  checkStockAlerts();
}

function quickAdjust(productId, delta) {
  // Creates a micro-lote for quick manual adjustments
  const lote = {
    id:     generateUniqueId('A'),
    date:   new Date().toISOString(),
    dateStr: new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short'}),
    timeStr: new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}),
    registradoPor: 'ajuste-manual',
    items: [{ productId, qty: delta }]
  };
  lotes.push(lote);
  saveLotes();
  renderStockGrid();
  toast(`Ajuste: ${delta > 0 ? '+' : ''}${delta} unidad`, delta > 0 ? 'success' : '');
}

function renderLoteHistory() {
  const el = document.getElementById('lote-history');
  if (!el) return;
  const pm = getProductMap();
  const recent = [...lotes].reverse().slice(0, 20);
  if (!recent.length) { el.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Sin lotes registrados.</p>'; return; }
  el.innerHTML = recent.map(l => {
    const chips = l.items.map(i => {
      const p = pm[i.productId];
      return `<span class="lote-chip">${p ? p.name : i.productId} ×${i.qty}</span>`;
    }).join('');
    return `<div class="lote-card">
      <div class="lote-card-head">
        <span class="lote-id">📦 ${l.id}</span>
        <span class="lote-date">${l.dateStr} ${l.timeStr}</span>
      </div>
      <div class="lote-items-chips">${chips}</div>
    </div>`;
  }).join('');
}

function checkStockAlerts() {
  products.forEach(p => {
    const stock = getStock(p.id);
    const min   = p.minStock || 10;
    if (stock === 0) toast(`⚠️ Sin stock: ${p.name}`, 'err');
    else if (stock <= min) toast(`⚠️ Stock bajo: ${p.name} (${stock} uds)`, 'warn');
  });
}

/* Descontar stock al confirmar ticket */
function descontarStock(ticketItems) {
  // Stock calculation is derived (lotes - tickets), so no mutation needed.
  // Just trigger a re-render of stock grid if visible.
  if (document.getElementById('panel-produccion')?.classList.contains('active')) {
    renderStockGrid();
  }
}

