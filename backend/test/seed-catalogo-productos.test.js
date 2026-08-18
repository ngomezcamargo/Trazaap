import assert from 'node:assert/strict';
import test from 'node:test';
import { CATALOGO_PRODUCTOS, resolverPrefijoInternoProducto } from '../scripts/catalogo-productos.js';

test('el catalogo QA genera prefijos internos validos, estables y unicos', () => {
  const primeraResolucion = CATALOGO_PRODUCTOS.map(resolverPrefijoInternoProducto);
  const segundaResolucion = CATALOGO_PRODUCTOS.map(resolverPrefijoInternoProducto);

  assert.deepEqual(segundaResolucion, primeraResolucion);
  assert.equal(new Set(primeraResolucion).size, CATALOGO_PRODUCTOS.length);
  assert.ok(primeraResolucion.every((prefijo) => /^[A-Z0-9]{2,5}$/.test(prefijo)));
  assert.equal(resolverPrefijoInternoProducto(CATALOGO_PRODUCTOS.find(({ nombre }) => nombre === 'Bagel')), 'BG');
  assert.equal(resolverPrefijoInternoProducto(CATALOGO_PRODUCTOS.find(({ nombre }) => nombre === 'Pan pita')), 'PPT');
  assert.equal(resolverPrefijoInternoProducto(CATALOGO_PRODUCTOS.find(({ nombre }) => nombre === 'Crinkle de chocolate')), 'CRK');
});
