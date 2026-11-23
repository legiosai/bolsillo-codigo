import {logoTienda, marcaTienda} from './tiendas.js';
import {calcular, claveLista, escribirLista, leerLista, normalizar, plata, prepararCatalogo} from './lista.mjs';

const $ = id => document.getElementById(id);
const $n = (tag, texto, clase) => {
  const nodo = document.createElement(tag);
  if (texto !== undefined) nodo.textContent = texto;
  if (clase) nodo.className = clase;
  return nodo;
};
const boton = (texto, clase, accion) => {
  const b = $n('button', texto, clase);
  b.type = 'button';
  b.onclick = accion;
  return b;
};
const dialogo = $('catalogo');
let productos, datos, cantidades, esEjemplo, busqueda = '';
const porId = id => productos.find(p => p.id === id);

let ranking = [];
let rubro = 'Todos';
let timerAviso;

function recuperar() {
  ({cantidades, esEjemplo} = leerLista(productos));
}
function foto(p) {
  const marco = $n('span', undefined, 'miniatura');
  const img = $n('img');
  img.src = 'recursos/productos/' + p.id + '.webp';
  img.alt = '';
  img.onerror = () => { img.hidden = true; };
  img.width = img.height = 50;
  marco.dataset.rubro = p.rubro;
  marco.append(img);
  return marco;
}
function informar(texto) {
  clearTimeout(timerAviso);
  $('feedback').hidden = false;
  $('feedback').textContent = texto;
  timerAviso = setTimeout(() => { $('feedback').hidden = true; }, 2300);
}

function guardar() {
  esEjemplo = false;
  escribirLista(cantidades);
  render();
}

function cambiar(p, delta) {
  const cantidad = Math.min(99, Math.max(0, (cantidades[p.id] || 0) + delta));
  if (cantidad) cantidades[p.id] = cantidad;
  else delete cantidades[p.id];
  guardar();
  const texto = p.nombre + (cantidad ? ' · cantidad ' + cantidad : ' se quitó de la lista');
  $(dialogo.open ? 'aviso' : 'estado').textContent = texto;
}

function verDialogo(titulo) {
  $('titulo-dialogo').textContent = titulo;
  $('contenido-dialogo').replaceChildren();
  if (!dialogo.open) dialogo.showModal();
}
function abrirCatalogo(consulta = '', filtro = 'Todos') {
  busqueda = consulta;
  rubro = filtro;
  verDialogo('Buscar productos');
  const input = $n('input');
  input.type = 'search';
  input.placeholder = 'Buscar yerba, huevos, tomate…';
  input.setAttribute('aria-label', 'Buscar productos');
  const filtros = $n('div', undefined, 'filtros');
  filtros.setAttribute('aria-label', 'Rubros');
  for (const categoria of ['Todos', ...new Set(productos.map(p => p.rubro))]) {
    const chip = boton(categoria, 'chip', () => { rubro = categoria; filtrar(); });
    filtros.append(chip);
  }
  const lista = $n('div', undefined, 'coincidencias');
  function filtrar() {
    busqueda = input.value;
    for (const b of filtros.children) b.setAttribute('aria-pressed', String(b.textContent === rubro));
    const encontrados = productos.filter(p => (rubro === 'Todos' || rubro === p.rubro) && normalizar(p.nombre).includes(normalizar(busqueda)));
    lista.replaceChildren();
    for (const p of encontrados) {
      const row = $n('div', undefined, 'pick');
      const ver = boton('', 'nombre-producto', () => abrirPrecios(p, true));
      ver.append($n('strong', p.nombre), $n('small', p.formato + ' · Ver precios'));
      const add = boton('+', 'add-one', () => {
        cambiar(p, 1);
        mostrarCantidad();
      });
      const mostrarCantidad = () => {
        const n = cantidades[p.id] || 0;
        add.textContent = n ? '＋ (' + n + ')' : '＋';
        add.setAttribute('aria-label', 'Agregar ' + p.nombre + (n ? ', en la lista ' + n : ''));
        add.disabled = n >= 99;
      };
      mostrarCantidad();
      row.append(foto(p), ver, add);
      lista.append(row);
    }
    if (!encontrados.length) lista.append($n('p', 'Sin resultados. Probá con otro producto.'));
  }
  input.value = busqueda;
  input.oninput = filtrar;
  $('contenido-dialogo').append(input, filtros, lista);
  filtrar();
  input.focus();
}

function enlaceOferta(oferta) {
  if (!oferta.enlace) return $n('span', oferta.nombre);
  const a = $n('a', oferta.nombre);
  a.href = oferta.enlace;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function abrirPrecios(p, volver) {
  const anterior = busqueda;
  const filtro = rubro;
  verDialogo(p.nombre);
  const area = $('contenido-dialogo');
  area.append($n('p', 'Menor precio por súper para ' + p.formato + '.', 'muted'));
  const ofertas = Array.from(p.mejores.entries()).sort((a,b) => a[1].precio - b[1].precio);
  for (const [id, oferta] of ofertas) {
    const row = $n('div', undefined, 'individual');
    const nombre = $n('div');
    nombre.append(marcaTienda(id, datos.tiendas[id].nombre), enlaceOferta(oferta));
    row.append(nombre, $n('b', plata(oferta.precio)));
    area.append(row);
  }
  if (!ofertas.length) area.append($n('p', 'Sin ofertas para esta presentación.'));
  const add = boton('Agregar a mi lista', 'primary', () => {
    cambiar(p, 1);
    dialogo.close();
    $('agregar').focus({preventScroll:true});
  });
  add.disabled = (cantidades[p.id] || 0) >= 99;
  area.append(add);
  const todas = $n('a', 'Comparar todas las presentaciones', 'otras-ofertas');
  todas.href = 'productos.html?producto=' + encodeURIComponent(p.id);
  area.append(todas);
  if (volver) area.append(boton('Volver a la búsqueda', 'text-button', () => {
    abrirCatalogo(anterior, filtro);
  }));
}

function dibujarLista() {
  const ids = Object.keys(cantidades);
  $('cantidad').textContent = ids.length + (ids.length === 1 ? ' producto' : ' productos');
  const area = $('items');
  area.replaceChildren();
  for (const id of ids) {
    const p = porId(id);
    const row = $n('div', undefined, 'item');
    const nombre = boton('', 'nombre-producto', () => abrirPrecios(p, false));
    nombre.append($n('strong', p.nombre), $n('small', p.formato + ' · Ver precios'));
    const pasos = $n('div', undefined, 'pasos');
    for (const delta of [-1, 1]) {
      const signo = delta < 0 ? '−' : '+';
      const b = boton(signo, '', () => {
        cambiar(p, delta);
        const control = document.getElementById('paso-' + id + signo);
        (control && !control.disabled ? control : $('agregar')).focus({preventScroll:true});
      });
      b.id = 'paso-' + id + signo;
      b.setAttribute('aria-label', (delta === 1 ? 'Sumar ' : 'Restar ') + p.nombre);
      if (delta === 1) { b.disabled = cantidades[id] >= 99; pasos.append($n('b', cantidades[id])); }
      pasos.append(b);
    }
    row.append(foto(p), nombre, pasos);
    area.append(row);
  }
  if (!ids.length) area.append($n('p', 'Elegí el primer producto de tu lista.', 'muted'));
  $('ejemplo').replaceChildren();
  $('tipo-lista').textContent = esEjemplo ? 'Lista de ejemplo' : 'Mi compra';
  $('copiar').disabled = !ids.length;
  if (esEjemplo) {
    $('ejemplo').append(boton('Empezar de cero', 'text-button', () => {
      cantidades = {};
      guardar();
      abrirCatalogo();
    }));
  }
}

function verGanador(completas) {
  const mejor = completas[0];
  const area = $('resumen');
  area.replaceChildren();
  const ticket = $('ticket');
  ticket.replaceChildren();
  if (!mejor) {
    const vacia = !Object.keys(cantidades).length;
    area.append($n('b', vacia ? 'Armá tu lista.' : 'Faltan precios.', 'sin-total'));
    area.append($n('p', vacia ? 'Sumá un producto para encontrar el súper más barato.' : 'Ningún súper tiene precio para toda tu compra.'));
    ticket.append($n('strong', 'Mi ticket'), $n('p', vacia ? 'Agregá un producto para armar el ticket.' : 'El ticket aparece cuando un súper tiene la lista completa.', 'ticket-vacio'));
    return;
  }
  const empatan = completas.filter(t => t.total === mejor.total);
  const nombres = empatan.map(t => t.nombre).join(' y ');
  const total = $n('div', undefined, 'importe-hero');
  const importe = plata(mejor.total).replace(/[^\d.,]/g, '');
  total.classList.toggle('largo', importe.length > 8);
  total.append($n('span', '$', 'peso'), $n('strong', importe));
  const destino = $n('p', undefined, 'destino');
  destino.append('en ', $n('strong', nombres));
  area.append(total, destino);
  if (empatan.length === 1 && completas.length > 1) {
    const segunda = completas[1];
    const ahorro = $n('p', undefined, 'ahorro');
    ahorro.append($n('b', plata(segunda.total - mejor.total) + ' menos'), ' que en ' + segunda.nombre);
    area.append(ahorro);
  } else {
    area.append($n('p', empatan.length > 1 ? 'Estas cadenas empatan en el menor total.' : 'Es la única cadena con toda la lista.', 'ahorro'));
  }

  const cabecera = $n('header', undefined, 'cab-pase');
  const marca = $n('span', undefined, 'wallet');
  marca.setAttribute('aria-hidden', 'true');
  cabecera.append(marca, $n('span', 'Mi ticket'), marcaTienda(mejor.id, mejor.nombre));
  const fotos = $n('div', undefined, 'fotos-pase');
  fotos.setAttribute('aria-hidden', 'true');
  for (const linea of mejor.lineas.slice(0, 3)) {
    const img = $n('img');
    img.src = 'recursos/productos/' + encodeURIComponent(linea.producto.id) + '.webp';
    img.alt = '';
    fotos.append(img);
  }
  const cantidad = mejor.lineas.length;
  const compra = $n('div', undefined, 'compra-pase');
  compra.append(fotos, $n('span', cantidad + (cantidad === 1 ? ' producto' : ' productos')));
  const abrir = boton('Ver ticket completo', 'abrir-ticket', () => abrirTicket(mejor));
  abrir.setAttribute('aria-haspopup', 'dialog');
  ticket.append(cabecera, $n('p', plata(mejor.total), 'total-pase'), compra, abrir);
}

function abrirTicket(tienda) {
  verDialogo('Mi ticket en ' + tienda.nombre);
  const contenido = $('contenido-dialogo');
  contenido.append($n('p', $('fecha').textContent, 'muted'));
  for (const linea of tienda.lineas) {
    const fila = $n('div', undefined, 'linea-detalle');
    const producto = $n('span', linea.producto.nombre);
    producto.append($n('small', linea.cantidad + ' × ' + linea.producto.formato + ' · ' + plata(linea.oferta.precio) + ' c/u'));
    fila.append(producto, $n('strong', plata(linea.importe)));
    contenido.append(fila);
  }
  const pie = $n('div', undefined, 'pie-detalle');
  pie.append($n('span', 'Total'), $n('strong', plata(tienda.total)));
  contenido.append(pie);
}

function dibujarTienda(t, mejor) {
  const details = $n('details', undefined, 'store');
  details.dataset.id = t.id;
  const summary = $n('summary');
  const nombre = $n('span', undefined, 'store-name');
  nombre.append($n('strong', t.nombre));
  const gana = t.completa && t.total === mejor?.total;
  if (t.completa) {
    if (gana) details.classList.add('ganador');
    nombre.append($n('small', gana ? 'Menor total' : plata(t.total - mejor.total) + ' más'));
  } else {
    nombre.append($n('small', t.disponible ? 'Falta precio de ' + t.faltan.join(', ') : 'Sin datos en esta actualización'));
  }
  const precio = $n('b', t.completa ? plata(t.total) : '—', 'amount');
  summary.append(logoTienda(t.id), nombre, precio);
  details.append(summary);
  for (const linea of t.lineas) {
    const row = $n('div', undefined, 'individual');
    const desc = $n('div');
    desc.append($n('strong', linea.cantidad + ' × ' + linea.producto.nombre + ' · ' + linea.producto.formato), enlaceOferta(linea.oferta));
    row.append(desc, $n('b', plata(linea.importe)));
    details.append(row);
  }
  if (!t.disponible) details.append($n('p','Esperando la próxima actualización de esta cadena.', 'muted'));
  return details;
}

function dibujarRanking(completas) {
  const zona = $('resultados');
  const abiertas = new Set([...zona.querySelectorAll('details[open]')].map(d => d.dataset.id));
  zona.replaceChildren();
  $('comparar-dos').hidden = completas.length < 2;
  $('cobertura').textContent = completas.length + ' de ' + ranking.length + ' súper con lista completa';
  if (!Object.keys(cantidades).length) {
    zona.append($n('p', 'Acá vas a ver los totales cuando agregues el primer producto.', 'muted'));
    return;
  }
  const parciales = ranking.filter(t => !t.completa);
  for (const t of completas) zona.append(dibujarTienda(t, completas[0]));
  if (parciales.length) {
    const faltantes = $n('details', undefined, 'incompletos');
    faltantes.dataset.id = 'incompletos';
    const titulo = $n('summary', 'Súper sin lista completa (' + parciales.length + ')');
    faltantes.append(titulo);
    for (const t of parciales) faltantes.append(dibujarTienda(t));
    faltantes.open = !completas.length;
    zona.append(faltantes);
  }
  for (const d of zona.querySelectorAll('details')) if (abiertas.has(d.dataset.id)) d.open = true;
  zona.append($n('p','El total suma la oferta más barata de cada presentación. Las marcas pueden variar. Envío y descuentos personales se calculan en el súper.', 'metodo'));
}

function compararDos() {
  const completas = ranking.filter(t => t.completa);
  if (completas.length < 2) return;
  verDialogo('Comparar dos súper');
  const area = $('contenido-dialogo');
  const campos = $n('div', undefined, 'duelo-selects');
  const tabla = $n('div', undefined, 'duelo-detalle');
  tabla.setAttribute('aria-live','polite');
  const picks = ['Primer súper','Segundo súper'].map((texto,i) => {
    const label = $n('label', texto);
    const select = $n('select');
    for (const t of completas) select.add(new Option(t.nombre, t.id));
    select.value = completas[i].id;
    label.append(select);
    campos.append(label);
    return select;
  });
  function actualizar() {
    const [a,b] = picks.map(pick => completas.find(t => t.id === pick.value));
    for (const [i,pick] of picks.entries()) {
      for (const option of pick.options) option.disabled = option.value === picks[1-i].value;
    }
    const diferencia = Math.abs(a.total - b.total);
    const menor = a.total < b.total ? a : b;
    tabla.replaceChildren($n('p', diferencia ? menor.nombre + ' cuesta ' + plata(diferencia) + ' menos.' : 'Los dos súper cuestan lo mismo.', 'resultado-duelo'));
    const cuadro = $n('table');
    const cabecera = cuadro.createTHead().insertRow();
    cabecera.append($n('th','Producto'));
    for (const t of [a,b]) {
      const columna = $n('th');
      columna.append(marcaTienda(t.id, t.nombre));
      cabecera.append(columna);
    }
    const cuerpo = cuadro.createTBody();
    const porProducto = new Map(b.lineas.map(l => [l.producto.id,l]));
    for (const l of a.lineas) {
      const otra = porProducto.get(l.producto.id);
      const fila = cuerpo.insertRow();
      const nombre = $n('th',l.cantidad + ' × ' + l.producto.nombre);
      nombre.scope = 'row';
      fila.append(nombre,$n('td',plata(l.importe), l.importe < otra.importe ? 'menor' : ''),$n('td',plata(otra.importe), otra.importe < l.importe ? 'menor' : ''));
    }
    const pie = cuadro.createTFoot().insertRow();
    pie.append($n('th','Total'),$n('td',plata(a.total)),$n('td',plata(b.total)));
    tabla.append(cuadro);
  }
  picks.forEach(pick => {pick.onchange = actualizar;});
  area.append(campos,tabla);
  actualizar();
}

async function copiarLista() {
  const lineas = ['Mi lista de compras'];
  for (const [id,n] of Object.entries(cantidades)) {
    const p = porId(id);
    lineas.push(n + ' × ' + p.nombre + ' · ' + p.formato);
  }
  const mejor = ranking.find(t => t.completa);
  if (mejor) lineas.push('', mejor.nombre + ' · ' + plata(mejor.total), $('fecha').textContent);
  const texto = lineas.join('\n');
  try {
    await navigator.clipboard.writeText(texto);
    informar('Lista copiada');
  } catch {
    verDialogo('Copiar lista');
    const campo = $n('textarea');
    campo.readOnly = true;
    campo.value = texto;
    campo.setAttribute('aria-label','Texto de la lista para copiar');
    $('contenido-dialogo').append(campo);
    campo.focus();
    campo.select();
  }
}

function render() {
  ranking = calcular(datos.tiendas, productos, cantidades);
  const completas = ranking.filter(t => t.completa);
  dibujarLista();
  dibujarRanking(completas);
  verGanador(completas);
}

async function iniciar() {
  const respuesta = await fetch('catalogo.json');
  if (!respuesta.ok) throw Error('Catálogo');
  datos = await respuesta.json();
  productos = prepararCatalogo(datos);
  recuperar();
  const fecha = new Intl.DateTimeFormat('es-AR', {day:'numeric', month:'short', year:'numeric', timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(datos.actualizado));
  $('fecha').textContent = 'Precios del ' + fecha;
  if (Date.now() - Date.parse(datos.actualizado) > 7 * 86400000) $('fecha').append(' · hace más de una semana');
  $('agregar').onclick = () => abrirCatalogo();
  $('comparar-dos').onclick = compararDos;
  $('copiar').onclick = copiarLista;
  $('cerrar').onclick = () => dialogo.close();
  dialogo.addEventListener('click', event => {
    const r = dialogo.getBoundingClientRect();
    if (event.target === dialogo && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialogo.close();
  });
  window.addEventListener('storage', evento => {
    if (evento.key !== claveLista && evento.key !== null) return;
    recuperar();
    render();
    if (dialogo.open) dialogo.close();
  });
  render();
  window.addEventListener('pageshow', evento => {
    if (evento.persisted) { recuperar(); render(); }
  });
  const id = new URLSearchParams(location.search).get('producto');
  if (id && porId(id)) location.replace('productos.html?producto=' + encodeURIComponent(id));
}
iniciar().catch(() => {
  $('agregar').disabled = $('copiar').disabled = true;
  $('titulo').textContent = 'Precios sin cargar';
  $('resultados').replaceChildren($n('p','No pudimos cargar el catálogo.', 'muted'), boton('Volver a intentar', 'secondary', () => location.reload()));
});
