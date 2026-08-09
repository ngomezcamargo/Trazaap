import assert from 'node:assert/strict';
import test from 'node:test';
import { generarCodigosAcceso, normalizarCodigo } from '../src/modulos/publico/codigos-acceso.util.js';

const trazabilidadBase = {
  lote: 'BG-001',
  produccion: {
    orden: { id: 17 },
    manufactura: { id_manufactura: 8 }
  },
  liberacion: {
    id_liberacion: 5,
    numero_factura: 'FAC-7788'
  }
};

test('generarCodigosAcceso produce codigos estables para cliente y auditoria', () => {
  const primero = generarCodigosAcceso(trazabilidadBase);
  const segundo = generarCodigosAcceso({ ...trazabilidadBase });

  assert.equal(primero.cliente, segundo.cliente);
  assert.equal(primero.auditoria, segundo.auditoria);
  assert.match(primero.cliente, /^CLI-BG001-[A-F0-9]{10}$/);
  assert.match(primero.auditoria, /^AUD-BG001-[A-F0-9]{10}$/);
});

test('normalizarCodigo permite comparar entradas del portal externo', () => {
  assert.equal(normalizarCodigo('  cli-bg001-abcd  '), 'CLI-BG001-ABCD');
});
