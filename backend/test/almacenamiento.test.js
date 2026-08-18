import assert from 'node:assert/strict';
import test from 'node:test';
import {
  crearControlAlmacenamientoService,
  crearIngresoAlmacenamientoService,
  registrarSalidaAlmacenamientoService,
  resolverRetencionAlmacenamientoService
} from '../src/modulos/almacenamiento/almacenamiento.service.js';

const usuario = { sub: '3', email: 'operario@trazaap.local' };
const manufactura = {
  id_manufactura: 8,
  id_orden_produccion: 17,
  id_producto: 2,
  codigo_orden: 'OP-017',
  producto: 'Bagel',
  lote_producido: 'BG-20260816-001',
  temperatura_almacenamiento_min_c: 15,
  temperatura_almacenamiento_max_c: 25,
  requiere_refrigeracion: false
};

const almacenamiento = {
  id_almacenamiento: 4,
  ...manufactura,
  estado: 'almacenado',
  fecha_salida: null,
  temperatura_min_esperada_c: 15,
  temperatura_max_esperada_c: 25
};

function depsBase(overrides = {}) {
  return {
    ejecutarTransaccionAlmacenamiento: async (callback) => callback({}),
    buscarManufacturaParaAlmacenamiento: async () => manufactura,
    buscarAlmacenamientoPorManufactura: async () => null,
    buscarUbicacionActiva: async () => ({ id_ubicacion: 1, nombre: 'Zona general' }),
    crearIngresoAlmacenamiento: async (data) => ({ id_almacenamiento: 4, ...data }),
    buscarAlmacenamientoPorId: async () => almacenamiento,
    crearControlAlmacenamiento: async (data) => ({ id_control: 9, ...data }),
    actualizarEstadoAlmacenamiento: async (id, estado) => ({ id_almacenamiento: id, estado }),
    listarControlesAlmacenamiento: async () => [{ id_control: 9, resultado: 'conforme', condicion_general: 'conforme' }],
    registrarSalidaAlmacenamiento: async (id, data) => ({ id_almacenamiento: id, ...data }),
    registrarResolucionAlmacenamiento: async (id, data) => ({ id_almacenamiento: id, ...data }),
    registrarEventoTrazabilidadAlmacenamiento: async () => {},
    encolarEventoBlockchain: async () => ({ id_outbox: 1 }),
    procesarOutboxAhora: async () => 0,
    ...overrides
  };
}

test('un ingreso dentro del rango queda almacenado y encola evidencia', async () => {
  let encolados = 0;
  const resultado = await crearIngresoAlmacenamientoService({
    id_manufactura: 8,
    id_ubicacion: 1,
    temperatura_ingreso_c: 20,
    observaciones: ''
  }, usuario, depsBase({ encolarEventoBlockchain: async () => { encolados += 1; } }));
  assert.equal(resultado.estado, 'almacenado');
  assert.equal(encolados, 1);
});

test('un ingreso fuera del rango exige observacion y conserva la desviacion', async () => {
  await assert.rejects(
    crearIngresoAlmacenamientoService({
      id_manufactura: 8, id_ubicacion: 1, temperatura_ingreso_c: 30, observaciones: ''
    }, usuario, depsBase()),
    (error) => error.status === 400 && /observacion/.test(error.message)
  );

  const resultado = await crearIngresoAlmacenamientoService({
    id_manufactura: 8, id_ubicacion: 1, temperatura_ingreso_c: 30, observaciones: 'Temperatura elevada al recibir'
  }, usuario, depsBase());
  assert.equal(resultado.estado, 'retenido');
  assert.equal(resultado.temperatura_ingreso_c, 30);
});

test('no permite dos almacenamientos para la misma manufactura', async () => {
  await assert.rejects(
    crearIngresoAlmacenamientoService({
      id_manufactura: 8, id_ubicacion: 1, temperatura_ingreso_c: 20, observaciones: ''
    }, usuario, depsBase({ buscarAlmacenamientoPorManufactura: async () => almacenamiento })),
    (error) => error.status === 409
  );
});

test('un control fuera de rango se guarda y retiene el lote', async () => {
  let estadoActualizado = '';
  const control = await crearControlAlmacenamientoService(4, {
    temperatura_c: 29,
    condicion_general: 'no_conforme',
    observaciones: 'Se ajusta ventilacion del area'
  }, usuario, depsBase({
    actualizarEstadoAlmacenamiento: async (id, estado) => { estadoActualizado = estado; return { id, estado }; }
  }));
  assert.equal(control.resultado, 'fuera_rango');
  assert.equal(estadoActualizado, 'retenido');
});

test('la salida exige al menos un control y un lote sin retencion', async () => {
  const datos = {
    temperatura_salida_c: 20,
    estado_producto_salida: 'conforme',
    decision_salida: 'liberar',
    observaciones: ''
  };
  await assert.rejects(
    registrarSalidaAlmacenamientoService(4, datos, usuario, depsBase({ listarControlesAlmacenamiento: async () => [] })),
    (error) => error.status === 400
  );
  await assert.rejects(
    registrarSalidaAlmacenamientoService(4, datos, usuario, depsBase({
      buscarAlmacenamientoPorId: async () => ({ ...almacenamiento, estado: 'retenido' })
    })),
    (error) => error.status === 422
  );
  const salida = await registrarSalidaAlmacenamientoService(4, datos, usuario, depsBase());
  assert.equal(salida.estado, 'listo_para_liberacion');
});

test('gerencia solo libera una retencion despues de un control conforme', async () => {
  const retenido = { ...almacenamiento, estado: 'retenido' };
  const datos = { decision: 'liberar', motivo: 'Condicion estabilizada', observaciones: '' };
  await assert.rejects(
    resolverRetencionAlmacenamientoService(4, datos, { sub: '2', email: 'gerente@trazaap.local' }, depsBase({
      buscarAlmacenamientoPorId: async () => retenido,
      listarControlesAlmacenamiento: async () => [{ resultado: 'fuera_rango', condicion_general: 'no_conforme' }]
    })),
    (error) => error.status === 422
  );
  const resolucion = await resolverRetencionAlmacenamientoService(
    4,
    datos,
    { sub: '2', email: 'gerente@trazaap.local' },
    depsBase({ buscarAlmacenamientoPorId: async () => retenido })
  );
  assert.equal(resolucion.estado, 'almacenado');
  assert.equal(resolucion.responsable_resolucion, 2);
});

