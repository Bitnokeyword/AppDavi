/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function dlFile(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content],{type}));
  a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function toast(msg, type='') {
  const c = document.getElementById('toast-container');
  const d = document.createElement('div');
  d.className = 'toast' + (type ? ' '+type : '');
  d.textContent = msg;
  c.appendChild(d);
  setTimeout(()=>d.remove(), 3200);
}

/* ── Tabs ──
   NOTA: la función goTab() real vive en el módulo "UPDATED FUNCTIONS"
   (más arriba). Esta segunda definición fue eliminada porque en JS
   una función declarada dos veces hace que la última gane, y esta
   versión vieja no conocía las pestañas "producción" ni "rutas"
   (por eso rompían al hacer clic) y usaba un índice de pestaña
   desactualizado (por eso "Administrar" resaltaba "Producción"). */

/* ── Offline detection ── */
function checkOnline() {
  document.getElementById('offline-pill').classList.toggle('show', !navigator.onLine);
}
window.addEventListener('online',  checkOnline);
window.addEventListener('offline', checkOnline);
checkOnline();

/* ── Close modals on overlay click ── */
document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click', e=>{ if(e.target===el) closeModal(el.id); });
});

/* ── Close ticket modal properly ── */
document.getElementById('modal-ticket').addEventListener('click', function(e){
  if (e.target===this) closeTicketModal();
});

