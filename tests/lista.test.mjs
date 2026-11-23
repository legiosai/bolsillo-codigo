import assert from 'node:assert/strict';
import test from 'node:test';
import {calcular, claveLista, escribirLista, leerLista, prepararCatalogo} from '../site/lista.mjs';

const tiendas = {
  a: {nombre:'A', disponible:true},
  b: {nombre:'B', disponible:true},
  c: {nombre:'C', disponible:false},
};

function huevo(tienda, precio, cantidad) {
  return {nombre:'Huevos x ' + cantidad, tienda, precio, porUnidad:{unidad:'u', precio: Math.round(100 * precio / cantidad) / 100}};
}

test('compara docenas, respeta cantidades y descarta subtotales y cadenas sin datos', () => {
  const productos = prepararCatalogo({tiendas, productos:[
    {id:'huevos', nombre:'Huevos', ofertas:[huevo('a', 30.01, 12), huevo('a', 10, 6), huevo('b', 20, 12), huevo('c', 1, 12)]},
    {id:'tomate', nombre:'Tomates', ofertas:[{tienda:'a', nombre:'Tomate x kg', precio:12.25, porUnidad:{unidad:'kg',precio:12.25}}]},
  ]});
  const [a,b,c] = calcular(tiendas, productos, {huevos:2,tomate:1});
  assert.equal(a.id, 'a');
  assert.equal(a.completa, true);
  assert.equal(a.total, 72.27);
  assert.equal(b.completa, false);
  assert.deepEqual(b.faltan, ['Tomates']);
  assert.equal(c.lineas.length, 0);
});

test('reconoce empates y listas vacías o sin cobertura', () => {
  const productos = prepararCatalogo({tiendas, productos:[
    {id:'huevos', nombre:'Huevos', ofertas:[huevo('a',50,12), huevo('b',50,12)]},
    {id:'limon', nombre:'Limón', ofertas:[]},
  ]});
  const ranking = calcular(tiendas, productos, {huevos:1});
  assert.equal(ranking.filter(t => t.completa && t.total === ranking[0].total).length, 2);
  for (const cantidades of [{},{limon:1}]) {
    assert.equal(calcular(tiendas, productos, cantidades).some(t => t.completa), false);
  }
});

test('conserva una lista del piloto y distingue una lista vacía del ejemplo inicial', t => {
  const almacenamiento = new Map();
  const anterior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => almacenamiento.get(key) ?? null,
    setItem: (key, value) => almacenamiento.set(key, value),
  }});
  t.after(() => {
    if (anterior) Object.defineProperty(globalThis, 'localStorage', anterior);
    else delete globalThis.localStorage;
  });
  const productos = [{id:'huevos'},{id:'tomate'}];
  assert.equal(leerLista(productos).esEjemplo,true);
  almacenamiento.set(claveLista, JSON.stringify({huevos:3,tomate:-1,anterior:7}));
  assert.deepEqual(leerLista(productos),{cantidades:{huevos:3},esEjemplo:false});
  escribirLista({});
  assert.deepEqual(leerLista(productos),{cantidades:{},esEjemplo:false});
});
