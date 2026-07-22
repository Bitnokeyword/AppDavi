/* ═══════════════════════════════════════════════════════
   ADMIN
═══════════════════════════════════════════════════════ */
function renderPriceList() {
  const cats = {};
  products.forEach(p=>{ if(!cats[p.cat]) cats[p.cat]=[]; cats[p.cat].push(p); });
  document.getElementById('price-list').innerHTML = Object.entries(cats).flatMap(([cat,items])=>
    items.map(p=>`<div class="price-row">
      <div><div class="pr-name">${p.name}</div><div class="pr-cat">${cat}${p.promo?' · 🏷️ '+p.promo:''}</div></div>
      <input class="price-inp" type="number" min="1" value="${p.price}" id="pr-${p.id}">
      <button class="del-prod-btn" onclick="deleteProduct('${p.id}')" title="Eliminar">✕</button>
    </div>`)
  ).join('');
}

function savePrices() {
  products.forEach(p=>{
    const inp=document.getElementById('pr-'+p.id);
    if (inp) { const v=parseInt(inp.value); if(v>0) p.price=v; }
  });
  saveProducts();
  renderProducts();
  toast('✓ Precios actualizados', 'success');
}

function addProduct() {
  const name  = document.getElementById('np-name').value.trim();
  const price = parseInt(document.getElementById('np-price').value);
  const cat   = document.getElementById('np-cat').value.trim();
  const promo = document.getElementById('np-promo').value.trim();
  if (!name || !price || !cat) { toast('Completa nombre, precio y categoría', 'warn'); return; }
  const id = 'custom_'+Date.now();
  products.push({ id, name, cat, price, promo: promo||undefined });
  saveProducts();
  renderProducts();
  renderPriceList();
  document.getElementById('np-name').value='';
  document.getElementById('np-price').value='';
  document.getElementById('np-cat').value='';
  document.getElementById('np-promo').value='';
  toast(`✓ "${name}" agregado`, 'success');
}

function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  products = products.filter(p=>p.id!==id);
  saveProducts();
  delete order[id];
  renderProducts();
  renderPriceList();
  refreshSummary();
  toast('Producto eliminado');
}

function saveConfig() {
  config.shopName = document.getElementById('cfg-shop-name').value.trim() || config.shopName;
  config.tagline  = document.getElementById('cfg-tagline').value.trim()   || config.tagline;
  config.wsp      = document.getElementById('cfg-wsp').value.trim().replace(/\D/g,'');
  saveConfigData();
  document.getElementById('shop-name-display').textContent = config.shopName;
  toast('✓ Configuración guardada', 'success');
}

function loadConfigForm() {
  document.getElementById('cfg-shop-name').value = config.shopName;
  document.getElementById('cfg-tagline').value   = config.tagline;
  document.getElementById('cfg-wsp').value       = config.wsp;
}

function exportAllData() {
  const data = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    config, products, tickets, clients, lotes, rutas
  };
  dlFile('pos-backup-'+new Date().toISOString().slice(0,10)+'.json',
         JSON.stringify(data,null,2), 'application/json');
  toast('✓ Backup exportado');
}

function showStorageInfo() {
  const used = Object.keys(localStorage).reduce((s,k)=>s+localStorage[k].length*2,0);
  const kb = (used/1024).toFixed(1);
  alert(`Almacenamiento usado: ~${kb} KB\nTickets guardados: ${tickets.length}\nProductos: ${products.length}`);
}

