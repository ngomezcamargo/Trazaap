import assert from 'node:assert/strict';
import test from 'node:test';
import { cantidadPendienteDevolucion, impactoInventarioSeguro } from '../src/modulos/devoluciones/devoluciones.service.js';

test('una devolucion posterior queda retenida y nunca disponible automaticamente', () => {
  assert.equal(impactoInventarioSeguro('devolucion_post_despacho'), 'retenido_pendiente_disposicion');
  assert.equal(impactoInventarioSeguro('rechazo_pre_despacho'), 'no_aplica');
});

test('la suma de devoluciones no puede superar lo realmente despachado', () => {
  assert.equal(cantidadPendienteDevolucion({ cantidad_despachada: 10, cantidad_devuelta_registrada: 4 }), 6);
  assert.equal(cantidadPendienteDevolucion({ cantidad_despachada: 10, cantidad_devuelta_registrada: 12 }), 0);
});
