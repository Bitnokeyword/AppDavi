/* ═══════════════════════════════════════════════════════
   AUTH MODULE
   - Roles: admin (PIN protegido) | vendor (acceso libre)
   - PIN hasheado con SHA-256 via Web Crypto API
   - Sesión guardada en sessionStorage (dura hasta cerrar tab)
   - Admin ve tabs extra + metadatos GPS en historial
═══════════════════════════════════════════════════════ */

const DEFAULT_ADMIN_PIN = '1234'; // cambiable desde Admin → Seguridad

function selectAuthRole(role) {
  authSelectedRole = role;
  document.getElementById('role-btn-admin').classList.toggle('active', role==='admin');
  document.getElementById('role-btn-vendor').classList.toggle('active', role==='vendor');
  document.getElementById('auth-pin-section').style.display   = role==='admin' ? '' : 'none';
  document.getElementById('auth-vendor-section').style.display= role==='vendor' ? '' : 'none';
  pinClear();
}

function pinKey(k) {
  if (authPinBuffer.length >= 4) return;
  authPinBuffer += k;
  updatePinDisplay();
  if (authPinBuffer.length === 4) setTimeout(pinEnter, 200);
}

function pinDel() {
  authPinBuffer = authPinBuffer.slice(0, -1);
  updatePinDisplay();
}

function pinClear() {
  authPinBuffer = '';
  updatePinDisplay();
  const err = document.getElementById('auth-error');
  if (err) err.textContent = '';
}

function updatePinDisplay() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd-' + i);
    if (dot) dot.classList.toggle('filled', i < authPinBuffer.length);
  }
}

async function pinEnter() {
  if (authPinBuffer.length < 4) return;
  const auth    = loadAuth();
  const stored  = auth.adminPinHash || await sha256(DEFAULT_ADMIN_PIN);
  const entered = await sha256(authPinBuffer);
  if (entered === stored) {
    loginAs('admin');
  } else {
    const err = document.getElementById('auth-error');
    if (err) err.textContent = 'PIN incorrecto. Intenta de nuevo.';
    authPinBuffer = '';
    updatePinDisplay();
    // Shake animation
    const box = document.querySelector('.auth-box');
    if (box) { box.style.animation='shake .3s'; setTimeout(()=>box.style.animation='',400); }
  }
}

function loginVendor() { loginAs('vendor'); }

function loginAs(role) {
  currentRole = role;
  sessionStorage.setItem('pos_role', role);
  // Apply role to body
  document.body.classList.remove('role-admin', 'role-vendor');
  document.body.classList.add('role-' + role);
  // Update badge
  const badge = document.getElementById('role-badge');
  if (badge) {
    badge.textContent  = role === 'admin' ? '👑 Admin' : '🛒 Vendedor';
    badge.className    = 'role-badge ' + role;
  }
  // Hide auth screen
  const screen = document.getElementById('auth-screen');
  if (screen) screen.style.display = 'none';
  // Re-render nav (admin tabs now visible)
  refreshNavForRole();
  toast(`Bienvenido — acceso ${role === 'admin' ? 'administrador' : 'vendedor'}`, 'success');
}

function logout() {
  if (!confirm('¿Cerrar sesión?')) return;
  currentRole = null;
  sessionStorage.removeItem('pos_role');
  document.body.classList.remove('role-admin', 'role-vendor');
  pinClear();
  authSelectedRole = 'admin';
  selectAuthRole('admin');
  const screen = document.getElementById('auth-screen');
  if (screen) screen.style.display = 'flex';
  // Go back to POS tab
  goTab('pos');
}

function refreshNavForRole() {
  // Admin-only tabs visibility handled by CSS class on body
  // Rebuild tab index map dynamically
}

/* Resume session if tab reloaded without closing */
function resumeSession() {
  const saved = sessionStorage.getItem('pos_role');
  if (saved) { loginAs(saved); return true; }
  return false;
}

/* Change admin PIN from admin panel */
async function saveAdminPin() {
  const p1 = (document.getElementById('pin-new').value || '').trim();
  const p2 = (document.getElementById('pin-confirm').value || '').trim();
  if (!/^\d{4}$/.test(p1)) { toast('El PIN debe ser exactamente 4 dígitos','warn'); return; }
  if (p1 !== p2) { toast('Los PINs no coinciden','warn'); return; }
  const auth = loadAuth();
  auth.adminPinHash = await sha256(p1);
  saveAuth(auth);
  document.getElementById('pin-new').value = '';
  document.getElementById('pin-confirm').value = '';
  toast('✓ PIN actualizado', 'success');
}

/* CSS shake keyframe (inline) */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)}
}`;
document.head.appendChild(shakeStyle);

