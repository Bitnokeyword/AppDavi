/* ═══════════════════════════════════════════════════════
   QR SCANNER MODULE (jsQR via CDN, loaded on demand)
   - Abre cámara trasera
   - Lee QR code del cliente (formato: FRIT-CLI-{id})
   - Auto-rellena cliente en POS
   - Funciona en HTTPS + localhost
═══════════════════════════════════════════════════════ */

let jsQRLoaded = false;

async function loadJsQR() {
  if (jsQRLoaded || window.jsQR) { jsQRLoaded = true; return true; }
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    s.onload  = () => { jsQRLoaded = true; resolve(true); };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function openQRScanner(onSuccess) {
  const loaded = await loadJsQR();
  if (!loaded) { toast('Sin conexión para cargar escáner QR','warn'); return; }

  const overlay = document.getElementById('qr-overlay');
  const video   = document.getElementById('qr-video');
  if (!overlay || !video) return;

  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    video.srcObject = qrStream;
    overlay.classList.add('open');

    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');

    function scanFrame() {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          closeQR();
          onSuccess(code.data);
          return;
        }
      }
      qrAnimFrame = requestAnimationFrame(scanFrame);
    }
    qrAnimFrame = requestAnimationFrame(scanFrame);

  } catch(e) {
    toast('No se pudo acceder a la cámara. Verifica los permisos.','err');
  }
}

function closeQR() {
  if (qrAnimFrame) { cancelAnimationFrame(qrAnimFrame); qrAnimFrame = null; }
  if (qrStream)    { qrStream.getTracks().forEach(t=>t.stop()); qrStream = null; }
  const overlay = document.getElementById('qr-overlay');
  if (overlay) overlay.classList.remove('open');
}

function handleQRResult(data) {
  // Expected format: FRIT-CLI-c1234567890
  const match = data.match(/FRIT-CLI-(.+)/);
  if (!match) { toast('QR no reconocido: ' + data.slice(0,30),'warn'); return; }
  const cid = match[1];
  const c   = clients.find(x=>x.id===cid);
  if (!c) { toast('Cliente no encontrado en el directorio','warn'); return; }

  // Auto-fill POS fields
  selectClient(c.id);
  if (activeRuta) marcarVisita(c.id);
  goTab('pos');
  toast(`✓ QR escaneado: ${c.name}`, 'success');
}

/* Add QR scan button to POS sidebar */
function addQRButtonToSidebar() {
  const clientWrap = document.querySelector('.client-wrap');
  if (!clientWrap || document.getElementById('btn-qr-scan')) return;
  const btn = document.createElement('button');
  btn.id = 'btn-qr-scan';
  btn.className = 'btn btn-ghost btn-sm';
  btn.style.marginTop = '8px';
  btn.innerHTML = '📷 Escanear QR del cliente';
  btn.onclick = () => openQRScanner(handleQRResult);
  clientWrap.appendChild(btn);
}

/* Generate QR code data URL for a client (for printing) */
function generateClientQR(clientId) {
  const data = `FRIT-CLI-${clientId}`;
  // Use qrcode.js if available, else return data string for manual generation
  if (window.QRCode) {
    const el = document.createElement('div');
    new QRCode(el, { text: data, width:128, height:128 });
    return el.querySelector('img')?.src || data;
  }
  return data;
}

