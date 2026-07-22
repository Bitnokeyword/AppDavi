/* ═══════════════════════════════════════════════════════
   HISTORIAL
═══════════════════════════════════════════════════════ */
/* ── Week key helper: YYYY-Www ── */
function isoWeek(dateStr) {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const w = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(w).padStart(2,'0')}`;
}

function getPeriodKey(isoDate, type) {
  if (type==='day')   return isoDate.slice(0,10);
  if (type==='week')  return isoWeek(isoDate);
  if (type==='month') return isoDate.slice(0,7);
  if (type==='year')  return isoDate.slice(0,4);
  return 'all';
}

function periodLabel(key, type) {
  if (type==='day')   return new Date(key+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  if (type==='week')  return `Semana ${key.split('-W')[1]}, ${key.split('-W')[0]}`;
  if (type==='month') { const [y,m]=key.split('-'); return new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'long',year:'numeric'}); }
  if (type==='year')  return `Año ${key}`;
  return 'Todo el historial';
}

function populatePeriodFilter() {
  const type = document.getElementById('hist-period-type').value;
  const sel  = document.getElementById('hist-period-value');
  const cur  = sel.value;

  if (type==='all') { sel.innerHTML='<option value="">—</option>'; sel.disabled=true; return; }
  sel.disabled = false;

  const keys = [...new Set(tickets.map(t=>getPeriodKey(t.isoDate, type)))].sort().reverse();
  sel.innerHTML = '<option value="">Todos</option>'
    + keys.map(k=>`<option value="${k}"${k===cur?' selected':''}>${periodLabel(k,type)}</option>`).join('');
}

function renderHistorial() {
  populatePeriodFilter();
  const type  = document.getElementById('hist-period-type').value;
  const value = document.getElementById('hist-period-value').value;

  const filtered = (type==='all' || !value)
    ? tickets
    : tickets.filter(t=>getPeriodKey(t.isoDate, type)===value);

  const totalVentas  = filtered.reduce((s,t)=>s+t.total,0);
  const totalTickets = filtered.length;
  document.getElementById('hist-summary').innerHTML = `
    <div class="hs-item"><div class="hs-lbl">Tickets</div><div class="hs-val">${totalTickets}</div></div>
    <div class="hs-item"><div class="hs-lbl">Total vendido</div><div class="hs-val">$${totalVentas}</div></div>
    <div class="hs-item"><div class="hs-lbl">Promedio por ticket</div><div class="hs-val">$${totalTickets?Math.round(totalVentas/totalTickets):0}</div></div>`;

  const body = document.getElementById('hist-body');
  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="8" class="hist-empty">Sin registros para este período.</td></tr>`;
    return;
  }
  body.innerHTML = [...filtered].reverse().map(t=>{
    const gpsLink = (currentRole==='admin' && t.geo?.lat)
      ? `<a href="https://maps.google.com/?q=${t.geo.lat},${t.geo.lng}" target="_blank"
            title="📍 ${t.geo.lat}, ${t.geo.lng} (±${t.geo.accuracy}m)"
            class="gps-meta-badge">📍 GPS</a>`
      : '';
    return `<tr>
      <td><b>${t.folio}</b></td>
      <td>${t.dateStr}</td>
      <td>${t.timeStr}</td>
      <td>${t.client||'—'} ${gpsLink}</td>
      <td style="color:var(--muted);font-size:.78rem">${t.items.map(i=>i.name+' ×'+i.qty).join(', ')}</td>
      <td><b style="color:var(--rose)">$${t.total}</b></td>
      <td><button class="hist-detail-btn" onclick="openHistDetail('${t.folio}')">Ver</button></td>
      <td><button class="hist-detail-btn" style="color:var(--rose)" onclick="deleteTicket('${t.folio}')" title="Eliminar">✕</button></td>
    </tr>`;
  }).join('');
}

function deleteTicket(folio) {
  const t = tickets.find(x=>x.folio===folio);
  const label = t ? `${t.folio}${t.client?' – '+t.client:''}  $${t.total}` : folio;
  if (!confirm(`¿Eliminar este ticket?\n\n${label}\n\nEsta acción no se puede deshacer.`)) return;
  tickets = tickets.filter(x=>x.folio!==folio);
  saveTickets();
  renderHistorial();
  toast('Ticket eliminado');
}

function openHistDetail(folio) {
  const t = tickets.find(x=>x.folio===folio);
  if (!t) return;
  histDetailTicket = t;
  document.getElementById('hist-detail-title').textContent = `Ticket ${t.folio}`;
  document.getElementById('hist-detail-content').innerHTML = ticketHTML(t);
  openModal('modal-hist-detail');
}
function printHistDetail() { window.print(); }

function exportHistorialTXT() {
  const type  = document.getElementById('hist-period-type').value;
  const value = document.getElementById('hist-period-value').value;
  const filtered = (type==='all'||!value) ? tickets : tickets.filter(t=>getPeriodKey(t.isoDate,type)===value);
  if (!filtered.length) { toast('Sin datos para exportar','warn'); return; }
  const L='═'.repeat(44);
  const header = value ? periodLabel(value,type) : 'Reporte completo';
  const lines = [
    config.shopName, header, L,
    `Tickets: ${filtered.length}   Total: $${filtered.reduce((s,t)=>s+t.total,0)}`,
    L,
    ...filtered.map(t=>`${t.folio}  ${t.dateStr}  ${t.timeStr}  ${t.client||''}  $${t.total}`
      +'\n  '+t.items.map(i=>`${i.name} x${i.qty}=$${i.sub}`).join(', ')),
    L,
  ];
  const fname = value ? `historial-${type}-${value}` : 'historial-completo';
  dlFile(`${fname}.txt`, lines.join('\n'), 'text/plain;charset=utf-8');
}

function purgeOldData() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth()-3);
  const before = tickets.length;
  tickets = tickets.filter(t=>new Date(t.isoDate)>=cutoff);
  const removed = before-tickets.length;
  saveTickets();
  renderHistorial();
  toast(removed>0 ? `✓ Se eliminaron ${removed} tickets con más de 3 meses.` : 'No hay datos más viejos de 3 meses.');
}

