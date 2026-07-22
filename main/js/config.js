/* ═══════════════════════════════════════════════════════
   STORAGE KEYS
═══════════════════════════════════════════════════════ */
const KEY_PRODUCTS  = 'pos_products';
const KEY_CONFIG    = 'pos_config';
const KEY_TICKETS   = 'pos_tickets';
const KEY_COUNTER   = 'pos_counter';
const KEY_CLIENTS   = 'pos_clients';
const KEY_LOTES     = 'pos_lotes';      // production batches
const KEY_RUTAS     = 'pos_rutas';      // delivery routes
const KEY_AUTH      = 'pos_auth';       // hashed PINs

/* ═══════════════════════════════════════════════════════
   DEFAULT CATALOGUE
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   CATÁLOGO POR DEFECTO
   Reemplaza estos productos con los del negocio del cliente.
   Cada producto necesita: id único, name, cat (categoría) y price.
   El cliente puede modificarlos desde Administrar → Productos y precios.
═══════════════════════════════════════════════════════ */
const DEFAULT_PRODUCTS = [
  { id:'prod_001', name:'Producto 1', cat:'Categoría A', price:100 },
  { id:'prod_002', name:'Producto 2', cat:'Categoría A', price:150 },
  { id:'prod_003', name:'Producto 3', cat:'Categoría B', price:200 },
  { id:'prod_004', name:'Producto 4', cat:'Categoría B', price:250 },
  { id:'prod_005', name:'Producto 5', cat:'Categoría C', price:50  },
];

const DEFAULT_CONFIG = {
  shopName: 'Productos de la Costa',
  tagline:  'Tu negocio de confianza',
  wsp:      '',
};

