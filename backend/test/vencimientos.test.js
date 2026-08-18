import assert from 'node:assert/strict';
import test from 'node:test';
import { clasificarVencimiento } from '../src/modulos/liberacion/vencimientos.util.js';

test('clasifica fuera de umbral, proximo y vencido sin confundir estados', () => {
  assert.equal(clasificarVencimiento('2026-10-01', '2026-08-18', 30), null);
  assert.equal(clasificarVencimiento('2026-09-01', '2026-08-18', 30), 'proximo_vencimiento');
  assert.equal(clasificarVencimiento('2026-08-18', '2026-08-18', 30), 'vencido');
  assert.equal(clasificarVencimiento('2026-08-01', '2026-08-18', 30), 'vencido');
});
