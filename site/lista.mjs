const formatos = {
  yerba: ['1 kg', 'kg', 1, 'Almacén'],
  atun: ['170 g', 'kg', 0.17, 'Almacén'],
  mayonesa: ['475 g', 'kg', 0.475, 'Almacén'],
  huevos: ['12 unidades', 'u', 12, 'Frescos'],
  papa: ['1 kg', 'kg', 1, 'Frescos'],
  cebolla: ['1 kg', 'kg', 1, 'Frescos'],
  zanahoria: ['1 kg', 'kg', 1, 'Frescos'],
  tomate: ['1 kg', 'kg', 1, 'Frescos'],
  limon: ['1 kg', 'kg', 1, 'Frescos'],
  detergente: ['500 ml', 'l', 0.5, 'Limpieza'],
  'papel-higienico': ['4 rollos de 30 m', 'u', 4, 'Limpieza'],
  'rollo-de-cocina': ['3 rollos de 50 paños', 'u', 3, 'Limpieza'],
  'salsa-cesar': ['350 g', 'kg', 0.35, 'Almacén'],
  'queso-untable': ['290 g', 'kg', 0.29, 'Frescos'],
  'arandanos': ['125 g', 'kg', 0.125, 'Frescos'],
  'ramen-vaso': ['65 g', 'kg', 0.065, 'Almacén'],
  'ramen-bolsa': ['70 g', 'kg', 0.07, 'Almacén'],
  'rucula': ['100 g', 'kg', 0.1, 'Frescos'],
  'lechuga': ['1 kg', 'kg', 1, 'Frescos'],
  'batata': ['1 kg', 'kg', 1, 'Frescos'],
  'pimiento': ['1 kg', 'kg', 1, 'Frescos'],
  'jabon-ropa': ['800 ml', 'l', 0.8, 'Limpieza'],
  'suavizante': ['900 ml', 'l', 0.9, 'Limpieza'],
  'lavandina': ['1 litro', 'l', 1, 'Limpieza'],
  'enjuague-bucal': ['500 ml', 'l', 0.5, 'Cuidado personal'],
  'algodon': ['75 g', 'kg', 0.075, 'Cuidado personal'],
  'hisopos': ['100 unidades', 'u', 100, 'Cuidado personal'],
  'jabon-manos': ['250 ml', 'l', 0.25, 'Cuidado personal'],
  'pasta-dental': ['90 g', 'kg', 0.09, 'Cuidado personal'],
  'desodorante-ambiente': ['360 ml', 'l', 0.36, 'Limpieza'],
};

const moneda = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger',
});
export const plata = valor => moneda.format(valor);
export const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function coincide(id, oferta, unidad, cantidad) {
  const por = oferta.porUnidad;
  if (!por || por.unidad !== unidad) return false;
  // El índice redondea el precio unitario al centavo.
  if (Math.abs(oferta.precio / cantidad - por.precio) > 0.011) return false;
  const nombre = normalizar(oferta.nombre);
  if (/fraccionada por 2 kg|entre \d/.test(nombre)) return false;
  if (id === 'pasta-dental' && /(?:pack|x)\s*(?:x\s*)?[2-9]\s*(?:u|x|de |envases)/.test(nombre)) return false;
  if (id === 'papel-higienico') return /\b30\s*m(?:\b|t|etro)/.test(nombre);
  if (id === 'rollo-de-cocina') return /\b50\s*pa/.test(nombre);
  return true;
}

export function prepararCatalogo(datos) {
  return datos.productos.filter(p => formatos[p.id]).map(producto => {
    const [formato, unidad, cantidad, rubro] = formatos[producto.id];
    const mejores = new Map();
    for (const oferta of producto.ofertas) {
      if (!datos.tiendas[oferta.tienda]?.disponible || !coincide(producto.id, oferta, unidad, cantidad)) continue;
      const anterior = mejores.get(oferta.tienda);
      if (!anterior || oferta.precio < anterior.precio) mejores.set(oferta.tienda, oferta);
    }
    return {...producto, formato, rubro, mejores};
  });
}

export function calcular(tiendas, productos, cantidades) {
  const pedidos = productos.filter(p => cantidades[p.id] > 0);
  return Object.entries(tiendas).map(([id, tienda]) => {
    const lineas = [];
    const faltan = [];
    let centavos = 0;
    for (const p of pedidos) {
      const oferta = p.mejores.get(id);
      if (!tienda.disponible || !oferta) {
        faltan.push(p.nombre);
        continue;
      }
      const cantidad = cantidades[p.id];
      const importe = Math.round(oferta.precio * 100) * cantidad;
      lineas.push({producto: p, cantidad, oferta, importe: importe / 100});
      centavos += importe;
    }
    return {id, ...tienda, lineas, faltan, completa: tienda.disponible && pedidos.length > 0 && !faltan.length, total: centavos / 100};
  }).sort((a, b) => Number(b.completa) - Number(a.completa)
    || Number(b.disponible) - Number(a.disponible) || a.faltan.length - b.faltan.length
    || a.total - b.total || a.nombre.localeCompare(b.nombre, 'es'));
}

export const claveLista = 'rosario-lista-presentaciones-v1';
const ejemplo = {yerba: 1, huevos: 1, tomate: 1};

export function leerLista(productos) {
  let guardada;
  try { guardada = JSON.parse(localStorage.getItem(claveLista)); } catch { /* Puede usarse en memoria. */ }
  const esEjemplo = !guardada || typeof guardada !== 'object' || Array.isArray(guardada);
  const origen = esEjemplo ? ejemplo : guardada;
  const cantidades = {};
  for (const p of productos) {
    const n = origen[p.id];
    if (Number.isInteger(n) && n > 0 && n <= 99) cantidades[p.id] = n;
  }
  return {cantidades, esEjemplo};
}

export function escribirLista(cantidades) {
  try { localStorage.setItem(claveLista, JSON.stringify(cantidades)); } catch { /* Sigue en memoria hasta cerrar. */ }
}
