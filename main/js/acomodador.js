/* ═══════════════════════════════════════════════════════
   ACOMODADOR
═══════════════════════════════════════════════════════ */
function renderAcomodador() {
  const pending = queue.filter(t=>!t.done).length;
  const done    = queue.filter(t=>t.done).length;
  document.getElementById('queue-stats').innerHTML = `
    <div class="stat-card"><div class="stat-num sn-pending">${pending}</div><div class="stat-lbl">Pendientes</div></div>
    <div class="stat-card"><div class="stat-num sn-done">${done}</div><div class="stat-lbl">Listos</div></div>
    <div class="stat-card"><div class="stat-num sn-total">${queue.length}</div><div class="stat-lbl">Total sesión</div></div>`;

  const list = document.getElementById('queue-list');
  if (!queue.length) {
    list.innerHTML = `<div class="queue-empty-state"><span>📭</span>Sin pedidos en esta sesión todavía.</div>`;
    return;
  }
  const sorted = [...queue.filter(t=>!t.done).reverse(), ...queue.filter(t=>t.done).reverse()];
  list.innerHTML = sorted.map(t=>{
    const chips = t.items.map(i=>`<div class="qc-chip"><span class="chip-qty">${i.qty}</span>${i.name}</div>`).join('');
    const clientSpan = t.client ? `<span class="qc-client">· ${t.client}</span>`:'';
    return `<div class="queue-card${t.done?' done':''}" id="qc-${t.folio}">
      <div class="qc-head">
        <span class="qc-folio">🎫 ${t.folio}</span>
        ${clientSpan}
        <span class="qc-time">🕐 ${t.timeStr}</span>
        <span class="qc-total">$${t.total}</span>
      </div>
      <div class="qc-body"><div class="qc-chips">${chips}</div></div>
      <div class="qc-footer">
        ${t.done
          ? `<button class="btn btn-ghost btn-sm" onclick="qUndo('${t.folio}')">↩️ Deshacer</button>`
          : `<button class="btn btn-green btn-sm" onclick="qDone('${t.folio}')">✅ Listo</button>`}
      </div>
    </div>`;
  }).join('');
}

function qDone(folio) {
  const t = queue.find(x=>x.folio===folio);
  if (t) { t.done=true; setTicketDone(folio, true); renderAcomodador(); updateBadge(); }
}
function qUndo(folio) {
  const t = queue.find(x=>x.folio===folio);
  if (t) { t.done=false; setTicketDone(folio, false); renderAcomodador(); updateBadge(); }
}
function clearDone() {
  const n = queue.filter(t=>t.done).length;
  if (!n) { toast('No hay completados para limpiar','warn'); return; }
  queue = queue.filter(t=>!t.done);
  renderAcomodador(); updateBadge();
}
function updateBadge() {
  const n = queue.filter(t=>!t.done).length;
  const b = document.getElementById('badge-acomo');
  b.textContent = n;
  b.classList.toggle('show', n>0);
}

