/* ═══════════════════════════════════════════════════════
   CLIENTES
═══════════════════════════════════════════════════════ */
// clients: [{ id, name, phone, note, firstSeen, lastSeen, totalSpent, ticketCount, lastItems }]

function normalName(n) { return n.trim().toLowerCase(); }

function upsertClient(name, phone, items, total, folio) {
  if (!name) return;
  const key = normalName(name);
  let c = clients.find(x=>normalName(x.name)===key);
  const now = new Date().toISOString();
  const lastItems = items.map(i=>i.name+' ×'+i.qty).join(', ');
  if (c) {
    if (phone && !c.phone) c.phone = phone;          // fill phone if missing
    c.lastSeen    = now;
    c.totalSpent  = (c.totalSpent||0) + total;
    c.ticketCount = (c.ticketCount||0) + 1;
    c.lastItems   = lastItems;
    c.lastTicketItems = items;  // full items for "repeat order"
  } else {
    clients.push({ id:'c'+Date.now(), name, phone:phone||'', note:'',
      firstSeen:now, lastSeen:now, totalSpent:total, ticketCount:1,
      lastItems, lastTicketItems:items });
  }
  saveClients();
}

function renderClients() {
  const q = (document.getElementById('clients-search').value||'').toLowerCase();
  const filtered = q
    ? clients.filter(c=>c.name.toLowerCase().includes(q)||(c.phone&&c.phone.includes(q)))
    : clients;
  const grid = document.getElementById('clients-grid');
  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);font-size:.9rem;">
      ${q ? 'Sin resultados para "'+q+'".' : 'Aún no hay clientes registrados.'}</div>`;
    return;
  }
  const sorted = [...filtered].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  grid.innerHTML = sorted.map(c=>{
    const phoneHtml = c.phone
      ? `<div class="cc-phone">📱 ${c.phone}</div>`
      : `<div class="cc-phone-none">Sin teléfono</div>`;
    const lastDate = c.lastSeen ? new Date(c.lastSeen).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    return `<div class="client-card">
      <div class="cc-name">${c.name}</div>
      ${phoneHtml}
      <div class="cc-stats">
        <span>🎫 <b>${c.ticketCount||0}</b> tickets</span>
        <span>💰 <b>$${c.totalSpent||0}</b> total</span>
      </div>
      <div class="cc-last">
        <div>Última visita: ${lastDate}</div>
        <div class="cc-last-items">${c.lastItems||'—'}</div>
      </div>
      <div class="cc-actions">
        <button class="btn btn-teal btn-sm" onclick="repeatOrder('${c.id}')">🔁 Repetir pedido</button>
        ${c.phone?`<button class="btn btn-green btn-sm" onclick="wspClient('${c.phone}')">💬 WA</button>`:''}
        <button class="btn btn-amber btn-sm" onclick="printClientQR('${c.id}')">📋 QR</button>
        <button class="btn btn-ghost btn-sm" onclick="openClientDetail('${c.id}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-sm del-client-btn" style="color:var(--rose)" data-cid="${c.id}" title="Eliminar cliente">✕</button>
      </div>
    </div>`;
  }).join('');
}

function repeatOrder(cid) {
  const c = clients.find(x=>x.id===cid);
  if (!c || !c.lastTicketItems || !c.lastTicketItems.length) {
    toast('Sin historial de productos para repetir','warn'); return;
  }
  // Load name + phone into POS fields
  document.getElementById('client-input').value  = c.name;
  document.getElementById('client-phone').value  = c.phone||'';
  // Load items into order
  clearOrder();
  c.lastTicketItems.forEach(i=>{ order[i.id]=i.qty; });
  renderProducts();
  refreshSummary();
  goTab('pos');
  toast(`✓ Pedido de ${c.name} cargado`,'success');
}

function wspClient(phone) {
  window.open(`https://wa.me/${phone}`, '_blank');
}

function openNewClientModal(prefillName) {
  document.getElementById('nc-name').value  = prefillName||'';
  document.getElementById('nc-phone').value = '';
  document.getElementById('nc-note').value  = '';
  document.getElementById('new-client-modal-title').textContent = 'Nuevo cliente';
  openModal('modal-new-client');
}

function saveNewClient() {
  const name  = document.getElementById('nc-name').value.trim();
  const phone = document.getElementById('nc-phone').value.trim().replace(/\D/g,'');
  const note  = document.getElementById('nc-note').value.trim();
  if (!name) { toast('El nombre es obligatorio','warn'); return; }
  // Duplicate check
  const dup = clients.find(c=>normalName(c.name)===normalName(name));
  if (dup) {
    toast(`⚠️ Ya existe un cliente con el nombre "${dup.name}"`, 'warn'); return;
  }
  clients.push({ id:'c'+Date.now(), name, phone, note,
    firstSeen:new Date().toISOString(), lastSeen:new Date().toISOString(),
    totalSpent:0, ticketCount:0, lastItems:'', lastTicketItems:[] });
  saveClients();
  closeModal('modal-new-client');
  renderClients();
  toast(`✓ Cliente "${name}" agregado`,'success');
}

function openClientDetail(cid) {
  const c = clients.find(x=>x.id===cid);
  if (!c) return;
  document.getElementById('cd-title').textContent = c.name;
  document.getElementById('cd-body').innerHTML = `
    <div class="form-group">
      <label class="field-label">Nombre</label>
      <input class="text-input" id="cd-name" value="${c.name}" maxlength="60">
    </div>
    <div class="form-group">
      <label class="field-label">📱 Teléfono WhatsApp</label>
      <input class="text-input" id="cd-phone" type="tel" value="${c.phone||''}" maxlength="20">
    </div>
    <div class="form-group">
      <label class="field-label">Nota</label>
      <input class="text-input" id="cd-note" value="${c.note||''}" maxlength="80">
    </div>`;
  document.getElementById('cd-footer').innerHTML = `
    <button class="btn btn-teal btn-sm" onclick="saveClientDetail('${cid}')">✓ Guardar</button>
    <button class="btn btn-ghost btn-sm" onclick="closeModal('modal-client-detail')">Cancelar</button>`;
  openModal('modal-client-detail');
}

function saveClientDetail(cid) {
  const c = clients.find(x=>x.id===cid);
  if (!c) return;
  const newName = document.getElementById('cd-name').value.trim();
  if (!newName) { toast('El nombre no puede estar vacío','warn'); return; }
  // Duplicate check (exclude self)
  const dup = clients.find(x=>x.id!==cid && normalName(x.name)===normalName(newName));
  if (dup) { toast(`⚠️ Ya existe "${dup.name}"`, 'warn'); return; }
  c.name  = newName;
  c.phone = document.getElementById('cd-phone').value.trim().replace(/\D/g,'');
  c.note  = document.getElementById('cd-note').value.trim();
  saveClients();
  closeModal('modal-client-detail');
  renderClients();
  toast('✓ Cliente actualizado','success');
}

function deleteClient(cid) {
  const idx = clients.findIndex(x=>x.id===cid);
  if (idx === -1) return;
  const c = clients[idx];
  if (!confirm(`¿Eliminar a "${c.name}" del directorio?\n\nSus tickets en el historial no se borran.`)) return;
  clients.splice(idx, 1);
  saveClients();
  renderClients();
  toast('Cliente eliminado');
}

/* ── Event delegation for delete buttons (avoids inline onclick ID quoting issues) ── */
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.del-client-btn');
  if (btn) { e.stopPropagation(); deleteClient(btn.dataset.cid); }
});

/* ── Autocomplete in POS sidebar ── */
function onClientInput() {
  refreshSummary();
  const val = (document.getElementById('client-input').value||'').trim().toLowerCase();
  const list = document.getElementById('ac-list');
  if (!val || val.length < 1) { list.style.display='none'; return; }
  const matches = clients.filter(c=>c.name.toLowerCase().includes(val)).slice(0,6);
  if (!matches.length) { list.style.display='none'; return; }
  list.innerHTML = matches.map(c=>`
    <div class="autocomplete-item" onmousedown="selectClient('${c.id}')">
      <span>${c.name}</span>
      <span class="ac-phone">${c.phone||''}</span>
    </div>`).join('');
  list.style.display='block';
}

function selectClient(cid) {
  const c = clients.find(x=>x.id===cid);
  if (!c) return;
  document.getElementById('client-input').value  = c.name;
  document.getElementById('client-phone').value  = c.phone||'';
  document.getElementById('ac-list').style.display='none';
  refreshSummary();
  toast(`👤 ${c.name} — última compra: ${c.lastItems||'sin datos'}`);
}

function hideAC() {
  setTimeout(()=>{ const l=document.getElementById('ac-list'); if(l) l.style.display='none'; }, 180);
}

/* ── Duplicate name warning on input blur ── */
document.addEventListener('DOMContentLoaded', ()=>{
  const inp = document.getElementById('client-input');
  if (inp) inp.addEventListener('blur', ()=>{
    const val = inp.value.trim();
    if (!val) return;
    const exists = clients.find(c=>normalName(c.name)===normalName(val));
    if (exists && exists.phone) {
      const phoneEl = document.getElementById('client-phone');
      if (phoneEl && !phoneEl.value) phoneEl.value = exists.phone;
    }
  });
});


