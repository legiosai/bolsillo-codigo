import {marcaTienda} from './tiendas.js';
import {claveLista, escribirLista, leerLista, normalizar, plata, prepararCatalogo} from './lista.mjs';

const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const byId = id => document.getElementById(id);
const unitLabel = {kg: 'kg', l: 'litro', u: 'unidad'};
const storageKey = 'rosario-productos-favoritos';
let favorites;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  favorites = new Set(Array.isArray(saved) ? saved.filter(x => typeof x === 'string') : []);
} catch { favorites = new Set(); }
let data, productosLista, cantidades, selected, onlyFavorites = false, order = 'envase';

function visibleProducts() {
  const query = normalizar(byId('busqueda').value);
  return data.productos.filter(p => (!onlyFavorites || favorites.has(p.id)) &&
    (normalizar(p.nombre).includes(query) || p.ofertas.some(o => normalizar(o.nombre).includes(query))));
}

function renderCatalog() {
  const products = visibleProducts();
  if (!products.some(p => p.id === selected)) {
    selected = products[0]?.id;
    order = 'envase';
  }
  const list = byId('catalog-list');
  list.replaceChildren();
  for (const product of products) {
    const btn = el('button', undefined, 'product');
    const img = el('img');
    img.src = 'recursos/productos/' + product.id + '.webp';
    img.alt = '';
    img.onerror = () => { img.hidden = true; };
    btn.append(img, el('span', product.nombre));
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(selected === product.id));
    btn.onclick = () => {
      selected = product.id;
      order = 'envase';
      renderCatalog();
      byId('catalog-list').querySelector('[aria-pressed=true]')?.focus({preventScroll: true});
    };
    list.append(btn);
  }
  if (!products.length) list.append(el('p', onlyFavorites && !favorites.size ? 'Todavía no guardaste favoritos.' : 'Sin resultados para esta búsqueda.', 'empty'));
  byId('todos').setAttribute('aria-pressed', String(!onlyFavorites));
  byId('favoritos').setAttribute('aria-pressed', String(onlyFavorites));
  renderComparison();
}

function value(offer) {
  if (order === 'envase') return offer.precio;
  return offer.porUnidad?.unidad === order ? offer.porUnidad.precio : null;
}

function priceBlock(offer, condensed = false) {
  const block = el('div', undefined, 'money');
  const unit = offer.porUnidad;
  const hasUnitPrice = order !== 'envase' && unit?.unidad === order;
  const text = hasUnitPrice ? plata(unit.precio) : plata(offer.precio);
  block.append(el('span', text, condensed ? '' : 'amount'));
  const note = hasUnitPrice ? 'por ' + unitLabel[order] + ' · envase ' + plata(offer.precio) :
    (order !== 'envase' ? 'envase · sin precio por ' + unitLabel[order] :
      (unit ? plata(unit.precio) + ' / ' + unitLabel[unit.unidad] : 'por envase'));
  block.append(el('p', note, 'small caption'));
  return block;
}

function renderComparison() {
  const area = byId('comparacion');
  area.replaceChildren();
  const product = data.productos.find(p => p.id === selected);
  const heading = el('h2', product?.nombre || 'Elegí un producto');
  heading.id = 'seleccion';
  if (!product) { area.append(heading); return; }

  const head = el('div', undefined, 'producthead');
  const toggle = el('button', favorites.has(selected) ? 'Quitar de favoritos' : 'Guardar favorito', 'fav');
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', String(favorites.has(selected)));
  toggle.onclick = () => {
    if (favorites.has(selected)) favorites.delete(selected); else favorites.add(selected);
    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch { /* Sesión sin almacenamiento */ }
    renderCatalog();
    (area.querySelector('.fav') || byId('favoritos')).focus({preventScroll: true});
  };
  head.append(heading, toggle);
  const referencia = productosLista.find(p => p.id === product.id);
  const add = el('button', undefined, 'primary');
  add.type = 'button';
  const rotular = () => {
    const n = cantidades[product.id] || 0;
    add.textContent = '＋ Agregar ' + referencia.formato + ' a mi lista' + (n ? ' (' + n + ')' : '');
    add.disabled = n >= 99;
  };
  if (referencia) {
    rotular();
    add.onclick = () => {
      cantidades[product.id] = Math.min(99, (cantidades[product.id] || 0) + 1);
      escribirLista(cantidades);
      rotular();
      byId('estado').textContent = product.nombre + ' · cantidad en tu lista: ' + cantidades[product.id];
    };
  }
  const controls = el('div', undefined, 'sort');
  const groups = Object.entries(data.tiendas).map(([id, store]) => ({
    id, store, offers: product.ofertas.filter(o => o.tienda === id && value(o) !== null).sort((a,b) => (value(a) ?? Infinity) - (value(b) ?? Infinity) || a.precio - b.precio || a.nombre.localeCompare(b.nombre, 'es'))
  }));
  const available = groups.filter(g => g.offers.length);
  const sorter = el('select');
  sorter.id = 'orden';
  const label = el('label','Comparar por '); label.htmlFor = 'orden';
  const units = ['envase', ...new Set(product.ofertas.map(o => o.porUnidad?.unidad).filter(Boolean))];
  for (const unit of units) {
    const option = el('option', unit === 'envase' ? 'precio del envase' : 'precio por ' + unitLabel[unit]);
    option.value = unit;
    sorter.append(option);
  }
  sorter.value = order;
  sorter.onchange = () => { order = sorter.value; renderComparison(); byId('orden').focus(); };
  label.append(sorter);
  controls.append(el('p',available.length + ' de ' + groups.length + ' cadenas con ofertas', 'small'),label);
  area.append(head);
  if (referencia) area.append(add);
  area.append(controls);
  available.sort((a,b) => (value(a.offers[0]) ?? Infinity) - (value(b.offers[0]) ?? Infinity) || a.store.nombre.localeCompare(b.store.nombre,'es'));
  const rank = el('div',undefined,'rank');
  for (const {id,store,offers} of available) {
    const details = el('details');
    const summary = el('summary');
    const name = el('div');
    name.append(marcaTienda(id,store.nombre),el('p',offers[0].nombre,'small caption'));
    summary.append(name,priceBlock(offers[0]));
    details.append(summary);
    for (const offer of offers) {
      const row = el('div',undefined,'offerline');
      const name = el(offer.enlace ? 'a' : 'span', offer.nombre);
      if (offer.enlace) { name.href = offer.enlace; name.target = '_blank'; name.rel = 'noopener noreferrer'; }
      row.append(name, priceBlock(offer,true));
      details.append(row);
    }
    rank.append(details);
  }
  if (available.length) area.append(rank);
  for (const {id,store} of groups.filter(g => !g.offers.length)) {
    let reason = 'Datos incompletos en esta actualización.';
    if (store.disponible) reason = product.ofertas.some(o => o.tienda === id) ? 'Sin precio comparable en la unidad elegida.' : 'Sin oferta verificada para este producto.';
    const estado = el('p', undefined, 'unavailable small');
    estado.append(marcaTienda(id,store.nombre), ' · ' + reason);
    area.append(estado);
  }
}

async function init() {
  const response = await fetch('catalogo.json');
  if (!response.ok) throw new Error('catálogo');
  data = await response.json();
  productosLista = prepararCatalogo(data);
  cantidades = leerLista(productosLista).cantidades;
  window.addEventListener('storage', evento => {
    if (evento.key === claveLista || evento.key === null) {
      cantidades = leerLista(productosLista).cantidades;
      renderComparison();
    }
  });
  window.addEventListener('pageshow', evento => {
    if (evento.persisted) {
      cantidades = leerLista(productosLista).cantidades;
      renderCatalog();
    }
  });
  selected = new URLSearchParams(location.search).get('producto');
  const date = new Date(data.actualizado);
  const stamp = new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'medium',timeStyle:'short'}).format(date);
  byId('fecha').textContent = 'Precios del ' + stamp + ' (Rosario)';
  if (Date.now() - date.getTime() > 7 * 86400000) {
    byId('fecha').append(el('span',' · hace más de una semana','notice'));
  }
  byId('todos').onclick = () => {onlyFavorites = false; renderCatalog();};
  byId('favoritos').onclick = () => {onlyFavorites = true; renderCatalog();};
  byId('busqueda').oninput = renderCatalog;
  renderCatalog();
}
init().catch(() => { byId('comparacion').replaceChildren(el('p','No se pudo cargar el catálogo. Volvé a abrir la página.','notice')); });
