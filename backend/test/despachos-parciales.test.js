import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bloquearDespachoPorFabric,
  confirmarDespachoProcesado,
  crearDespachoService,
  registrarConfirmacionEntregaService
} from '../src/modulos/despachos/despachos.service.js';

const solicitud = {
  id_cliente: 4,
  numero_factura: 'FAC-200',
  fecha_despacho: new Date('2026-08-08T12:00:00.000Z'),
  conductor: 'Laura Gomez',
  placa_vehiculo: 'ABC123',
  temperatura_salida_c: 18,
  temperatura_transporte_c: 19,
  limpieza_vehiculo: 'cumple',
  documentacion_dotacion: 'cumple',
  canal_distribucion: 'Venta directa',
  observaciones: '',
  detalles: [{ id_inventario_producto_terminado: 15, cantidad_despachada: 3 }]
};

const inventario = {
  id_inventario: 15,
  id_liberacion: 5,
  lote: 'LT-001',
  producto: 'Bagel',
  estado_liberacion: 'aprobado',
  estado_almacenamiento: 'liberado',
  unidades_liberadas: 10,
  unidades_reservadas: 0,
  unidades_despachadas: 0,
  unidades_disponibles: 10,
  fecha_vencimiento: '2099-12-31',
  temperatura_min_esperada_c: 15,
  temperatura_max_esperada_c: 25
};

function depsCrear(overrides = {}) {
  return {
    buscarClientePorId: async () => ({ id_cliente: 4, nombre_razon_social: 'Cliente Uno', estado: 'activo' }),
    ejecutarTransaccionDespacho: async (callback) => callback({}),
    bloquearInventarios: async () => [inventario],
    siguienteCodigoDespacho: async () => 'DES-20260808-000001',
    crearDespacho: async (data) => ({ ...data, id_despacho: 20 }),
    reservarUnidadesInventario: async (_id, cantidad) => ({
      ...inventario,
      unidades_reservadas: cantidad,
      unidades_disponibles: inventario.unidades_disponibles - cantidad
    }),
    crearDetalleDespacho: async (data) => ({ ...data, id_detalle: 30 }),
    registrarEventoTrazabilidadDespacho: async () => {},
    encolarEventoBlockchain: async (evento) => evento,
    ...overrides
  };
}

test('crear un despacho reserva unidades y encola la validacion Fabric', async () => {
  const reservas = [];
  const outbox = [];
  const resultado = await crearDespachoService(solicitud, {
    sub: 3,
    email: 'operario@trazaap.local'
  }, depsCrear({
    reservarUnidadesInventario: async (id, cantidad) => {
      reservas.push({ id, cantidad });
      return { ...inventario, unidades_reservadas: cantidad, unidades_disponibles: 7 };
    },
    encolarEventoBlockchain: async (evento) => {
      outbox.push(evento);
      return evento;
    }
  }));

  assert.deepEqual(reservas, [{ id: 15, cantidad: 3 }]);
  assert.equal(resultado.estado_despacho, undefined);
  assert.equal(resultado.detalles[0].cantidad_despachada, 3);
  assert.equal(outbox[0].operacion, 'registrar_despacho');
});

test('PostgreSQL rechaza solicitar mas unidades de las disponibles', async () => {
  await assert.rejects(
    crearDespachoService({
      ...solicitud,
      detalles: [{ id_inventario_producto_terminado: 15, cantidad_despachada: 11 }]
    }, { sub: 3, email: 'operario@trazaap.local' }, depsCrear()),
    (error) => error.status === 409 && error.details.codigo === 'STOCK_INSUFICIENTE'
  );
});

test('la confirmacion de Fabric convierte la reserva en unidades despachadas', async () => {
  const estados = [];
  const deps = {
    ejecutarTransaccionDespacho: async (callback) => callback({}),
    buscarDespachoSimplePorId: async () => ({
      id_despacho: 20,
      codigo_despacho: 'DES-20260808-000001',
      estado_despacho: 'pendiente_validacion_blockchain',
      responsable_despacho: 3
    }),
    listarDetallesDespacho: async () => [{
      id_inventario_producto_terminado: 15,
      cantidad_despachada: 3,
      lote: 'LT-001'
    }],
    confirmarReservaInventario: async () => ({
      ...inventario,
      unidades_reservadas: 0,
      unidades_despachadas: 3,
      unidades_disponibles: 7,
      estado: 'despacho_parcial'
    }),
    actualizarEstadoAlmacenamientoDesdeInventario: async (_id, estado) => estados.push(estado),
    registrarEventoTrazabilidadDespacho: async () => {},
    actualizarDespacho: async (_id, estado) => ({ id_despacho: 20, estado_despacho: estado })
  };

  const resultado = await confirmarDespachoProcesado(20, { transactionId: 'tx-20' }, deps);
  assert.deepEqual(estados, ['despacho_parcial']);
  assert.equal(resultado.estado_despacho, 'despachado');
});

test('un rechazo definitivo de Fabric devuelve la reserva y bloquea el despacho', async () => {
  const devoluciones = [];
  const deps = {
    ejecutarTransaccionDespacho: async (callback) => callback({}),
    buscarDespachoSimplePorId: async () => ({ id_despacho: 20, estado_despacho: 'pendiente_validacion_blockchain' }),
    listarDetallesDespacho: async () => [{
      id_inventario_producto_terminado: 15,
      cantidad_despachada: 3,
      lote: 'LT-001'
    }],
    liberarReservaInventario: async (id, cantidad) => {
      devoluciones.push({ id, cantidad });
      return { ...inventario, estado: 'disponible' };
    },
    actualizarEstadoAlmacenamientoDesdeInventario: async () => {},
    actualizarDespacho: async (_id, estado, extra) => ({ estado_despacho: estado, motivo_bloqueo: extra.motivo })
  };

  const resultado = await bloquearDespachoPorFabric(
    20,
    Object.assign(new Error('Saldo agotado'), { codigo: 'LOTE_SIN_EXISTENCIAS' }),
    deps
  );
  assert.deepEqual(devoluciones, [{ id: 15, cantidad: 3 }]);
  assert.equal(resultado.estado_despacho, 'bloqueado');
});

test('cada despacho solo admite una confirmacion y exige su credencial privada', async () => {
  let creadas = 0;
  const despacho = {
    id_despacho: 20,
    codigo_despacho: 'DES-20260808-000001',
    numero_factura: 'FAC-200',
    estado_despacho: 'despachado',
    es_heredado: false
  };
  const deps = {
    buscarDespachoPorId: async () => despacho,
    ejecutarTransaccionDespacho: async (callback) => callback({}),
    buscarConfirmacionPorDespacho: async () => null,
    crearConfirmacionEntrega: async (data) => {
      creadas += 1;
      return { ...data, id_confirmacion: 40 };
    },
    encolarEventoBlockchain: async () => ({})
  };

  await assert.rejects(
    registrarConfirmacionEntregaService({
      id_despacho: 20,
      factura: 'INCORRECTA',
      codigo: '',
      receptor: 'Ana Ruiz',
      temperatura_entrega_c: 18,
      observaciones: ''
    }, deps),
    (error) => error.status === 403
  );

  const resultado = await registrarConfirmacionEntregaService({
    id_despacho: 20,
    factura: 'FAC-200',
    codigo: '',
    receptor: 'Ana Ruiz',
    temperatura_entrega_c: 18,
    observaciones: ''
  }, deps);
  assert.equal(resultado.id_confirmacion, 40);
  assert.equal(creadas, 1);
});
