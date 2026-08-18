import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calcularFechaVencimiento,
  esPrefijoLoteValido,
  formatearLote,
  normalizarCodigoFabrica,
  normalizarFechaProduccion,
  normalizarPrefijoLote,
  sugerirPrefijoLote
} from '../src/modulos/produccion/lotes.util.js';
import { productoFabricadoSchema, registroManufacturaSchema } from '../src/modulos/produccion/produccion.schemas.js';
import { entorno } from '../src/configuracion/entorno.js';
import { generarLoteProducto } from '../src/modulos/produccion/produccion.repository.js';

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

test('formatea el lote con fabrica, fabricacion, vencimiento y consecutivo', () => {
  assert.equal(formatearLote('prueba', '2026-08-13', '2026-08-18', 1), 'PRUEBA-20260813-20260818-0001');
  assert.equal(formatearLote('PRUEBA', '2026-08-13', '2026-08-18', 27), 'PRUEBA-20260813-20260818-0027');
  assert.equal(normalizarCodigoFabrica(' prueba '), 'PRUEBA');
  assert.throws(() => formatearLote('PRUEBA', '2026-08-18', '2026-08-13', 1));
  assert.throws(() => formatearLote('PRUEBA', '2026-08-13', '2026-08-18', 10000));
  assert.throws(() => normalizarFechaProduccion('2026-02-30'));
});

test('calcula vencimiento usando la fecha de la orden', () => {
  assert.equal(calcularFechaVencimiento('2026-08-13', 5), '2026-08-18');
});

test('genera lotes unicos ante solicitudes concurrentes usando fechas reales del contexto', async () => {
  const anterior = entorno.codigoFabrica;
  entorno.codigoFabrica = 'PRUEBA';
  let consecutivo = 0;
  const db = { query: async (sql, params) => {
    if (sql.includes('FROM ordenes_produccion_productos')) return { rows: [{ fecha_produccion: '2026-08-13', vida_util_dias: 5 }] };
    assert.deepEqual(params, ['PRUEBA', '2026-08-13', '2026-08-18']);
    consecutivo += 1;
    return { rows: [{ ultimo_consecutivo: consecutivo }] };
  } };
  try {
    const lotes = await Promise.all([generarLoteProducto(1, 2, db), generarLoteProducto(1, 2, db)]);
    assert.deepEqual(lotes.map((x) => x.lote_producido), [
      'PRUEBA-20260813-20260818-0001',
      'PRUEBA-20260813-20260818-0002'
    ]);
    assert.equal(lotes[0].fecha_vencimiento_calculada, '2026-08-18');
  } finally {
    entorno.codigoFabrica = anterior;
  }
});

test('la manufactura no acepta lote digitado como fuente de verdad', () => {
  const manufactura = registroManufacturaSchema.parse({
    responsable_usuario_id: 3,
    unidades_producidas: 10,
    lote_producido: 'MANUAL-001',
    equipos_utilizados: ['Horno de prueba'],
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
