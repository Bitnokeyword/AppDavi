/* ═══════════════════════════════════════════════════════
   PRODUCTS MAP helper
═══════════════════════════════════════════════════════ */
function getProductMap() {
  const m = {};
  products.forEach(p => m[p.id] = p);
  return m;
}

/* ═══════════════════════════════════════════════════════
   RENDER PRODUCTS GRID
═══════════════════════════════════════════════════════ */
/* Tracks which categories are expanded — persists across renderProducts calls */
const catOpenState = {};

function renderProducts() {
  const container = document.getElementById('products-container');

  // Group by category preserving insertion order
  const cats = {};
  const catOrder = [];
  products.forEach(p => {
    if (!cats[p.cat]) { cats[p.cat] = []; catOrder.push(p.cat); }
    cats[p.cat].push(p);
  });
  const uniqueCats = [...new Set(catOrder)];

  // Default: first category open, rest closed (only on first render)
  uniqueCats.forEach((cat, i) => {
    if (catOpenState[cat] === undefined) catOpenState[cat] = (i === 0);
  });

  container.innerHTML = uniqueCats.map(cat => {
    const items   = cats[cat];
    const isOpen  = catOpenState[cat];

    // Count selected items in this category (for badge when collapsed)
    const selectedCount = items.filter(p => (order[p.id] || 0) > 0).length;

    const cards = items.map(p => {
      const qty      = order[p.id] || 0;
      const promoTag = p.promo ? `<span class="promo-tag">${p.promo}</span>` : '';
      return `<div class="prod-card${qty > 0 ? ' selected' : ''}" id="pc-${p.id}">
        ${promoTag}
        <div class="prod-name">${p.name}</div>
        <div class="prod-price">$${p.price}</div>
        <div class="qty-controls">
          <button class="qty-btn minus" onclick="chQty('${p.id}',-1)">−</button>
          <input class="qty-inp" type="number" min="0" value="${qty}"
                 id="qi-${p.id}" onchange="setQty('${p.id}',this.value)" oninput="setQty('${p.id}',this.value)">
          <button class="qty-btn plus" onclick="chQty('${p.id}',1)">+</button>
        </div>
      </div>`;
    }).join('');

    const badgeHTML = selectedCount > 0
      ? `<span class="cat-badge show">${selectedCount}</span>`
      : `<span class="cat-badge"></span>`;

    return `<div class="cat-block" id="catblock-${CSS.escape(cat)}">
      <div class="cat-header${isOpen ? ' open' : ''}" onclick="toggleCat('${cat.replace(/'/g,"\\'")}')">
        <div class="cat-header-left">
          <span class="cat-name">${cat}</span>
          ${badgeHTML}
        </div>
        <span class="cat-chevron">▼</span>
      </div>
      <div class="cat-body${isOpen ? ' open' : ''}">
        <div class="prod-grid">${cards}</div>
      </div>
    </div>`;
  }).join('');
}

/**
 * Toggle a category open/closed.
 * Updates catOpenState and re-renders only the affected block
 * (avoids full re-render so qty inputs don't reset).
 */
function toggleCat(cat) {
  catOpenState[cat] = !catOpenState[cat];
  // Update DOM directly — no full re-render needed
  document.querySelectorAll('.cat-block').forEach(block => {
    const header = block.querySelector('.cat-header');
    const body   = block.querySelector('.cat-body');
    const name   = block.querySelector('.cat-name');
    if (!name || name.textContent !== cat) return;
    const open = catOpenState[cat];
    header.classList.toggle('open', open);
    body.classList.toggle('open', open);
  });
}

/**
 * Called after setQtyVal to refresh the badge counter
 * on the category header without full re-render.
 */
function refreshCatBadge(productId) {
  const p = getProductMap()[productId];
  if (!p) return;
  const cat   = p.cat;
  const block = document.getElementById('catblock-' + CSS.escape(cat));
  if (!block) return;
  const items         = products.filter(x => x.cat === cat);
  const selectedCount = items.filter(x => (order[x.id] || 0) > 0).length;
  const badge         = block.querySelector('.cat-badge');
  if (badge) {
    badge.textContent = selectedCount;
    badge.classList.toggle('show', selectedCount > 0);
  }
}

/* ═══════════════════════════════════════════════════════
   ORDER MANAGEMENT
═══════════════════════════════════════════════════════ */
function chQty(id, d) { setQtyVal(id, Math.max(0, (order[id]||0)+d)); }
function setQty(id, v) { setQtyVal(id, Math.max(0, parseInt(v)||0)); }
function setQtyVal(id, v) {
  if (v===0) delete order[id]; else order[id]=v;
  const inp = document.getElementById('qi-'+id);
  if (inp && parseInt(inp.value)!==v) inp.value = v;
  const card = document.getElementById('pc-'+id);
  if (card) card.classList.toggle('selected', v>0);
  refreshCatBadge(id);   // update selected-items badge on category header
  refreshSummary();
}
function removeItem(id) { setQtyVal(id,0); }

function clearOrder() {
  Object.keys(order).forEach(id => {
    delete order[id];
    const inp = document.getElementById('qi-'+id); if (inp) inp.value=0;
    const card= document.getElementById('pc-'+id); if (card) card.classList.remove('selected');
  });
  refreshSummary();
}

function refreshSummary() {
  const body = document.getElementById('order-body');
  const totEl = document.getElementById('total-display');
  const btn   = document.getElementById('btn-ticket');
  const ids = Object.keys(order);
  if (!ids.length) {
    body.innerHTML = '<p class="order-empty">Sin productos aún.</p>';
    totEl.textContent = '$0';
    btn.disabled = true;
    return;
  }
  const client = (document.getElementById('client-input').value||'').trim();
  btn.disabled = !client;
  btn.title = client ? '' : 'Escribe el nombre del cliente para continuar';
  const pm = getProductMap();
  let total = 0, rows = '';
  ids.forEach(id => {
    const p=pm[id], q=order[id], s=p.price*q; total+=s;
    rows+=`<tr>
      <td><button class="rm-btn" onclick="removeItem('${id}')">✕</button> ${p.name}</td>
      <td style="text-align:center;color:var(--muted)">${q}</td>
      <td>$${s}</td>
    </tr>`;
  });
  body.innerHTML = `<table class="order-table">
    <thead><tr><th>Producto</th><th style="text-align:center">Cant</th><th>Sub</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  totEl.textContent = '$'+total;
}

