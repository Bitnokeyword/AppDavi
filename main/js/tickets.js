/* ═══════════════════════════════════════════════════════
   TICKET GENERATION
═══════════════════════════════════════════════════════ */
function buildTicketData(folio) {
  const ids = Object.keys(order);
  if (!ids.length) return null;
  const now     = new Date();
  const dateStr = now.toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
  const timeStr = now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  const isoDate = now.toISOString();
  const client  = (document.getElementById('client-input').value||'').trim();
  const pm      = getProductMap();
  const items   = [];
  let total=0;
  ids.forEach(id=>{
    const p=pm[id],q=order[id],s=p.price*q; total+=s;
    items.push({id,name:p.name,cat:p.cat,qty:q,price:p.price,sub:s});
  });
  return { folio, dateStr, timeStr, isoDate, client, phone: (document.getElementById('client-phone').value||'').trim().replace(/\D/g,''), items, total,
           shopName:config.shopName, tagline:config.tagline, done:false };
}

function ticketHTML(t) {
  const rows = t.items.map(i=>
    `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${i.price}</td><td>$${i.sub}</td></tr>`
  ).join('');
  const clientLine = t.client
    ? `<div class="tkt-client">👤 ${t.client}</div>`:'';
  return `<div class="tkt-header">
    <div style="font-size:2rem;margin-bottom:4px">🏪</div>
    <div class="tkt-shop">${t.shopName}</div>
    <div class="tkt-tagline">${t.tagline}</div>
  </div>
  <hr class="tkt-divider">
  <div class="tkt-meta">
    <b>Fecha:</b> ${t.dateStr}<br>
    <b>Hora:</b> ${t.timeStr}<br>
    <b>Folio:</b> ${t.folio}
    ${clientLine}
  </div>
  <hr class="tkt-divider">
  <table class="tkt-table">
    <thead><tr><th>Producto</th><th>Cant</th><th>P.U.</th><th>Importe</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr class="tkt-divider">
  <div class="tkt-total">
    <span class="tkt-total-lbl">TOTAL A PAGAR</span>
    <span class="tkt-total-amt">$${t.total}</span>
  </div>
  <div class="tkt-thanks"><br>
    <b style="color:var(--bark-dark)">¡Gracias por tu compra!<br>
    Esperamos verte pronto.<br>
    <small>Conserva este ticket como comprobante de compra.</small>
  </div>`;
}

async function openTicketModal() {
  const ids = Object.keys(order);
  if (!ids.length) return;
  // Reserva atómica del folio (100% atómico si hay Firebase — ver getNextFolio en state.js)
  const folio = await getNextFolio();
  const t = buildTicketData(folio);
  if (!t) return;
  // Capture GPS silently in background — won't block UI
  const geo = await captureGPS();
  if (geo) t.geo = geo;
  pendingTkt = t;
  document.getElementById('ticket-content').innerHTML = ticketHTML(t);
  // Show WA client button only if phone captured
  const btnC = document.getElementById('btn-wsp-client');
  if (btnC) btnC.style.display = t.phone ? '' : 'none';
  openModal('modal-ticket');
}

function confirmTicket() {
  if (!pendingTkt) return;
  // Upsert client directory
  const clientEl = document.getElementById('client-input');
  const foundClient = clients.find(c => normalName(c.name) === normalName(pendingTkt.client));
  upsertClient(pendingTkt.client, pendingTkt.phone, pendingTkt.items, pendingTkt.total, pendingTkt.folio);
  // Link to active ruta if any
  if (activeRuta) linkTicketToRuta(pendingTkt.folio, foundClient?.id);
  // Save to persistent DB
  tickets.push(pendingTkt);
  saveTickets();
  // Deduct from stock (derived — just re-render if visible)
  descontarStock(pendingTkt.items);
  // Push to acomodador queue
  queue.push(pendingTkt);
  updateBadge();
  clearOrder();
  if (clientEl) clientEl.value = '';
  const phoneEl = document.getElementById('client-phone');
  if (phoneEl) phoneEl.value = '';
  pendingTkt = null;
}

function closeTicketModal() {
  confirmTicket();          // save + queue + clear order — only happens HERE
  closeModal('modal-ticket');
}

// Imprimir: solo imprime, el modal sigue abierto
function printTicket() {
  window.print();
  toast('🖨️ Enviado a impresora');
}

// PDF: abre ventana aparte, el modal sigue abierto
function downloadPDF() {
  if (!pendingTkt) return;
  const content = document.getElementById('ticket-content').innerHTML;
  const pdfName = pendingTkt.client ? pendingTkt.client.trim() : pendingTkt.folio;
  const w = window.open('','_blank','width=480,height=680');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${pdfName} – ${pendingTkt.shopName}</title>
    <style>
      :root{--rose:#D4607A;--bark-dark:#3D2B1A;--muted:#9E8878;--teal:#3D8C8C;--cream-200:#EDD9C4;--cream-300:#E0C4A8;--rose-pale:#FAE8ED;}
      body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;margin:0;padding:24px;background:#fff;max-width:380px;}
      .tkt-header{text-align:center;padding-bottom:14px}
      .tkt-shop{font-family:Georgia,'Palatino Linotype',serif;font-size:1.5rem;color:var(--bark-dark)}
      .tkt-tagline{font-size:.78rem;color:var(--muted);margin-top:2px}
      .tkt-divider{border:none;border-top:1.5px dashed var(--cream-300);margin:12px 0}
      .tkt-meta{font-size:.78rem;color:var(--muted);line-height:1.8}
      .tkt-meta b{color:#2A1A0E}
      .tkt-client{font-size:.85rem;color:var(--teal);font-weight:600;margin-top:4px}
      .tkt-table{width:100%;border-collapse:collapse;margin:4px 0}
      .tkt-table th{font-size:.68rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);padding-bottom:6px;border-bottom:1px solid var(--cream-200);text-align:left}
      .tkt-table th:last-child{text-align:right}
      .tkt-table td{padding:5px 2px;font-size:.82rem;border-bottom:1px dotted var(--cream-200)}
      .tkt-table td:last-child{text-align:right;font-weight:600}
      .tkt-table td:nth-child(2){text-align:center;color:var(--muted);font-size:.78rem}
      .tkt-total{display:flex;justify-content:space-between;align-items:baseline;background:var(--rose-pale);border-radius:10px;padding:10px 14px;margin-top:10px}
      .tkt-total-lbl{font-weight:700;font-size:.88rem;color:#7A5C42}
      .tkt-total-amt{font-family:Georgia,serif;font-size:1.6rem;color:var(--rose)}
      .tkt-thanks{text-align:center;margin-top:16px;font-size:.78rem;color:var(--muted);line-height:1.7}
      @media print{@page{margin:8mm}}
    </style></head><body>
    ${content}
    <script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
    </body></html>`);
  w.document.close();
  toast('📄 PDF abierto en nueva ventana');
}

// .txt: descarga el archivo, el modal sigue abierto
function downloadTXT() {
  if (!pendingTkt) return;
  const t = pendingTkt;
  const L = '─'.repeat(38);
  const pad = (s,w)=>String(s).padEnd(w);
  const rpad= (s,w)=>String(s).padStart(w);
  const clientLine = t.client ? `Cliente : ${t.client}\n` : '';
  const rows = t.items.map(i=>pad(i.name,22)+rpad(`${i.qty}x$${i.price}=$${i.sub}`,15)).join('\n');
  const txt = [
    '         '+t.shopName,
    '     '+t.tagline,
    L,
    `Fecha   : ${t.dateStr}`,
    `Hora    : ${t.timeStr}`,
    `Folio   : ${t.folio}`,
    clientLine.trim(),
    L,
    pad('Producto',22)+rpad('Cant × P.U. = Sub',15),
    L, rows, L,
    rpad(`TOTAL: $${t.total}`,38),
    L,
    '       ¡Gracias por tu visita!',
    '         Esperamos verte pronto.',
  ].filter(x=>x!=='').join('\n');
  const fname = t.client ? t.client.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,'').trim() : t.folio;
  dlFile(`${fname}.txt`, txt, 'text/plain;charset=utf-8');
  toast('📝 .txt descargado');
}

// WhatsApp: abre link, el modal sigue abierto
function sendWhatsApp(target) {
  if (!pendingTkt) return;
  const t = pendingTkt;
  const number = target==='client' ? t.phone : config.wsp;
  if (!number) {
    toast(target==='client'
      ? '⚠️ Este cliente no tiene teléfono registrado'
      : '⚠️ Configura el número WhatsApp del negocio en Administrar → Configuración', 'warn');
    return;
  }
  const clientLine = t.client ? `👤 *Cliente:* ${t.client}\n` : '';
  const rows = t.items.map(i=>`  • ${i.name} x${i.qty} = $${i.sub}`).join('\n');
  const msg = `🧊 *${t.shopName}*\n${t.tagline}\n\n`
    + `📋 *Ticket ${t.folio}*\n`
    + `📅 ${t.dateStr}  🕐 ${t.timeStr}\n`
    + clientLine + '\n'
    + rows + '\n\n'
    + `💰 *TOTAL: $${t.total}*\n\n`
    + `¡Gracias por tu compra!`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  toast('💬 WhatsApp abierto');
}

