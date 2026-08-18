import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calcularFechaVencimiento,
  esPrefijoLoteValido,
  formatearLote,
  normalizarFechaProduccion,
  normalizarPrefijoLote,
  sugerirPrefijoLote
} from '../src/modulos/produccion/lotes.util.js';
import { productoFabricadoSchema, registroManufacturaSchema } from '../src/modulos/produccion/produccion.schemas.js';

test('normaliza y valida prefijos de lote', () => {
  assert.equal(normalizarPrefijoLote(' bg '), 'BG');
  assert.equal(esPrefijoLoteValido('BG'), true);
  assert.equal(esPrefijoLoteValido('B'), false);
  assert.equal(esPrefijoLoteValido('B-G'), false);
});

test('sugiere BG para Bagel y prefijos deterministas para otros productos', () => {
  assert.equal(sugerirPrefijoLote('Bagel'), 'BG');
  assert.equal(sugerirPrefijoLote('Pan trenza'), 'PT');
});

test('formatea el lote con fecha de produccion y consecutivo', () => {
  assert.equal(formatearLote('BG', '2026-08-13', 1), 'BG-20260813-001');
  assert.equal(formatearLote('BG', '2026-08-13', 27), 'BG-20260813-027');
  assert.equal(formatearLote('BG', '2026-08-13', 1000), 'BG-20260813-1000');
  assert.throws(() => normalizarFechaProduccion('2026-02-30'));
});

test('calcula vencimiento usando la fecha de la orden', () => {
  assert.equal(calcularFechaVencimiento('2026-08-13', 5), '2026-08-18');
});

test('la manufactura no acepta lote digitado como fuente de verdad', () => {
  const manufactura = registroManufacturaSchema.parse({
    responsable_usuario_id: 3,
    unidades_producidas: 10,
    lote_producido: 'MANUAL-001',
    hora_inicio: '2026-08-13T10:00:00.000Z',
    hora_fin: '2026-08-13T11:00:00.000Z'
  });

  assert.equal(Object.hasOwn(manufactura, 'lote_producido'), false);
});

test('Bagel solo puede utilizar el prefijo BG', () => {
  const base = {
    nombre: 'Bagel',
    categoria: 'Panificacion',
    vida_util_dias: 5,
    variantes: [{ receta: [{ materia_prima_id: 1, cantidad_requerida: 1 }] }]
  };

  assert.equal(productoFabricadoSchema.safeParse({ ...base, prefijo_lote: 'BG' }).success, true);
  assert.equal(productoFabricadoSchema.safeParse({ ...base, prefijo_lote: 'XX' }).success, false);
});
