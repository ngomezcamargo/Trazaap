import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generarHashSHA256,
  normalizarInspeccionRecepcion,
  normalizarRecepcion
} from '../src/modulos/blockchain/blockchain.service.js';

const recepcionBase = {
  id: 15,
  proveedor_id: 2,
  proveedor_nombre: 'Proveedor demo',
  proveedor_nit: '900123456-7',
  materia_prima_id: 4,
  materia_prima_nombre: 'Harina de trigo',
  fecha_recepcion: '2026-05-06T19:19:36.275Z',
  lote_proveedor: 'L-2026-001',
  numero_lote: 'L-2026-001',
  fecha_vencimiento: '2026-08-01',
  cantidad: '25.000',
  unidad_medida: 'kg',
  presentacion: 'bulto',
  temperatura_recepcion: '18.5',
  peso_recibido: '25.000',
  recibido_por: 'admin@trazaap.local',
  estado_recepcion: 'aceptado',
  observaciones: 'Sin hallazgos'
};

test('generarHashSHA256 genera el mismo hash con distinto orden de claves', () => {
  const hashA = generarHashSHA256({ a: 1, b: { c: 2, d: 3 } });
  const hashB = generarHashSHA256({ b: { d: 3, c: 2 }, a: 1 });

  assert.equal(hashA, hashB);
});

test('normalizarRecepcion produce un payload estable para la evidencia Fabric', () => {
  const payload = normalizarRecepcion(recepcionBase);

  assert.equal(payload.id, undefined);
  assert.equal(payload.proveedorId, undefined);
  assert.equal(payload.materiaPrimaId, undefined);
  assert.equal(payload.lote, 'L-2026-001');
  assert.equal(payload.cantidad, 25);
  assert.equal(payload.fechaVencimiento, '2026-08-01');
  assert.equal(typeof generarHashSHA256(payload), 'string');
});

test('normalizarInspeccionRecepcion incluye decision, vehiculo y conductor', () => {
  const payload = normalizarInspeccionRecepcion({
    ...recepcionBase,
    inspeccion_id: 8,
    olor: true,
    color: true,
    textura: true,
    estado_empaque: true,
    certificado_calidad: true,
    inspeccion_transporte: true,
    condiciones_vehiculo: true,
    higiene_conductor: false,
    decision_final: 'retenido',
    inspeccionado_por: 'admin@trazaap.local',
    inspeccionado_en: '2026-05-06T19:25:00.000Z'
  });

  assert.equal(payload.id, undefined);
  assert.equal(payload.recepcionId, undefined);
  assert.equal(payload.condicionesVehiculo, true);
  assert.equal(payload.higieneConductor, false);
  assert.equal(payload.decisionFinal, 'retenido');
});
