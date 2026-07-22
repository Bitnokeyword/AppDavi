/* ═══════════════════════════════════════════════════════
   QR GENERATION MODULE
   - Genera QR por cliente con código FRIT-CLI-{id}
   - Renderiza en modal usando qrcode.js (CDN on demand)
   - Imprime hoja con QR + nombre del negocio, lista para
     pegar en la tienda del cliente
═══════════════════════════════════════════════════════ */

let qrcodeLibLoaded = false;
let currentQRClient = null;

async function loadQRCodeLib() {
  if (qrcodeLibLoaded || window.QRCode) { qrcodeLibLoaded = true; return true; }
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    s.onload  = () => { qrcodeLibLoaded = true; resolve(true); };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function printClientQR(cid) {
  const c = clients.find(x => x.id === cid);
  if (!c) return;

  currentQRClient = c;

  const ok = await loadQRCodeLib();
  const renderEl = document.getElementById('qr-code-render');
  const codeStr  = `FRIT-CLI-${c.id}`;

  renderEl.innerHTML = '';    // clear previous

  if (ok && window.QRCode) {
    // Render with qrcodejs
    new QRCode(renderEl, {
      text:            codeStr,
      width:           200,
      height:          200,
      colorDark:       '#2A1A0E',
      colorLight:      '#FFFFFF',
      correctLevel:    QRCode.CorrectLevel.H   // High — tolerates 30% damage
    });
  } else {
    // Fallback: show code string + link to generate externally
    renderEl.innerHTML = `
      <div style="padding:20px;border:2px dashed var(--cream-300);border-radius:8px;font-size:.8rem;color:var(--muted)">
        Sin conexión para generar QR.<br>
        <a href="https://qr.io/?text=${encodeURIComponent(codeStr)}" target="_blank"
           style="color:var(--teal)">Generar online →</a>
      </div>`;
  }

  // Show client info
  document.getElementById('qr-modal-title').textContent = `QR — ${c.name}`;
  document.getElementById('qr-client-info').innerHTML   =
    `<b>${c.name}</b><br>${c.address || ''}${c.phone ? '<br>📱 '+c.phone : ''}`;
  document.getElementById('qr-code-string').textContent = codeStr;

  openModal('modal-client-qr');
}

function printClientQRSheet() {
  const c = currentQRClient;
  if (!c) return;

  const codeStr = `FRIT-CLI-${c.id}`;

  // Get the QR canvas/img from the rendered element
  const renderEl = document.getElementById('qr-code-render');
  const qrImg    = renderEl.querySelector('img') || renderEl.querySelector('canvas');
  let   qrSrc    = '';

  if (qrImg?.tagName === 'IMG')    qrSrc = qrImg.src;
  if (qrImg?.tagName === 'CANVAS') qrSrc = qrImg.toDataURL();

  const shopName = config.shopName || 'Mi Negocio';
  const address  = c.address || '';
  const lastDate = c.lastSeen
    ? new Date(c.lastSeen).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})
    : '—';

  // Build a clean print-only page with the QR + client info
  const printWin = window.open('', '_blank', 'width=500,height=700');
  printWin.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>QR — ${c.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: #fff;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 20px;
    }
    .sheet {
      width: 100%; max-width: 320px;
      border: 2px solid #E0C4A8;
      border-radius: 16px;
      padding: 28px 24px;
      text-align: center;
    }
    .shop-name {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 1.1rem; color: #3D2B1A;
      margin-bottom: 4px;
    }
    .divider {
      border: none; border-top: 1.5px dashed #C8A882;
      margin: 14px 0;
    }
    .qr-box {
      display: flex; justify-content: center;
      margin: 12px 0;
    }
    .qr-box img { width: 200px; height: 200px; }
    .client-name {
      font-size: 1rem; font-weight: 700;
      color: #2A1A0E; margin-bottom: 4px;
    }
    .client-detail {
      font-size: .75rem; color: #9E8878; line-height: 1.6;
    }
    .code-str {
      font-family: monospace; font-size: .65rem;
      background: #F7EDE2; border-radius: 6px;
      padding: 4px 8px; margin-top: 10px;
      display: inline-block; color: #7A5C42;
      word-break: break-all;
    }
    .instr {
      font-size: .72rem; color: #9E8878;
      margin-top: 14px; line-height: 1.5;
    }
    .instr b { color: #3D2B1A; }
    @media print {
      body { min-height: unset; }
      @page { margin: 8mm; size: A6; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="shop-name">🏪 ${shopName}</div>
    <div style="font-size:.7rem;color:#9E8878">Sistema de distribución</div>
    <hr class="divider">

    <div class="qr-box">
      ${qrSrc
        ? `<img src="${qrSrc}" alt="QR ${c.name}">`
        : `<div style="width:200px;height:200px;border:2px dashed #C8A882;border-radius:8px;
                        display:flex;align-items:center;justify-content:center;
                        font-size:.75rem;color:#9E8878;padding:16px">
             Genera el QR con el código de abajo
           </div>`}
    </div>

    <div class="client-name">${c.name}</div>
    <div class="client-detail">
      ${address ? address + '<br>' : ''}
      ${c.phone ? '📱 ' + c.phone : ''}
    </div>

    <div class="code-str">${codeStr}</div>

    <hr class="divider">
    <div class="instr">
      <b>Instrucciones:</b><br>
      Pega este código en un lugar visible del negocio.<br>
      El vendedor lo escanea al llegar para registrar la visita.
    </div>
  </div>
  <script>
    window.onload = () => setTimeout(() => window.print(), 400);
  <\/script>
</body>
</html>`);

  printWin.document.close();
  toast('🖨️ Hoja QR enviada a impresora');
}


