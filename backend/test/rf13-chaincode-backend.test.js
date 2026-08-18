import assert from 'node:assert/strict';
import test from 'node:test';
import { crearLiberacionService } from '../src/modulos/liberacion/liberacion.service.js';
import { confirmarRecepcionClienteService } from '../src/modulos/publico/publico.service.js';

const dataLiberacion = {
  id_manufactura: 8,
  responsable_liberacion_usuario_id: 3,
  tipo_empaque: 'Bolsa sellada',
  unidades_empacadas: 10,
  peso_neto: 5,
  fecha_vencimiento: '2099-12-31',
  etiqueta_verificada: true,
  verificacion_envase: true,
  estado_liberacion: 'aprobado',
  motivo_retencion: '',
  motivo_rechazo: '',
  observaciones: ''
};

const manufactura = {
  id_manufactura: 8,
  id_orden_produccion: 17,
  id_producto: 2,
  codigo_orden: 'OP-017',
  producto: 'Bagel',
  tamano_presentacion: 'mediano',
  lote_producido: 'LT-001',
  id_almacenamiento: 4,
  estado_almacenamiento: 'listo_para_liberacion',
  unidades_producidas: 10,
  fecha_vencimiento_calculada: '2099-12-31'
};

function dependenciasLiberacion(overrides = {}) {
  return {
    buscarManufacturaPorId: async () => manufactura,
    buscarLiberacionPorManufactura: async () => null,
    buscarUsuarioOperarioPorId: async () => ({ id: 3, email: 'operario@trazaap.local' }),
    ejecutarTransaccionLiberacion: async (callback) => callback({ query: async () => ({ rows: [] }) }),
    crearLiberacionProducto: async (data) => ({
      ...data,
      id_liberacion: 5,
      fecha_liberacion: '2026-08-08T12:00:00.000Z'
    }),
    crearInventarioProductoTerminadoDesdeLiberacion: async (data) => ({
      ...data,
      id_inventario: 15,
      unidades_disponibles: data.unidades_liberadas
    }),
    actualizarAlmacenamientoDesdeLiberacion: async (_id, estado) => ({ id_almacenamiento: 4, estado }),
    registrarEventoTrazabilidad: async () => {},
    encolarEventoBlockchain: async (evento) => evento,
    ...overrides
  };
}

test('liberar 10 unidades crea inventario disponible y no crea un despacho', async () => {
  const inventarios = [];
  const eventosOutbox = [];
  const deps = dependenciasLiberacion({
    crearInventarioProductoTerminadoDesdeLiberacion: async (data) => {
      inventarios.push(data);
      return { ...data, id_inventario: 15, unidades_disponibles: data.unidades_liberadas };
    },
    encolarEventoBlockchain: async (evento) => {
      eventosOutbox.push(evento);
      return evento;
    }
  });

  const resultado = await crearLiberacionService(
    dataLiberacion,
    { email: 'calidad@trazaap.local' },
    deps
  );

  assert.equal(inventarios.length, 1);
  assert.equal(inventarios[0].unidades_liberadas, 10);
  assert.equal(inventarios[0].estado, 'disponible');
  assert.equal(resultado.inventario_producto_terminado.unidades_disponibles, 10);
  assert.deepEqual(
    eventosOutbox.map((evento) => evento.operacion || 'registrar'),
    ['registrar', 'inicializar_inventario_terminado']
  );
  assert.equal(eventosOutbox.some((evento) => evento.tipoEvento === 'despacho_producto'), false);
});

test('una liberacion rechazada no ingresa producto al inventario despachable', async () => {
  let inventarios = 0;
  let estadoAlmacenamiento = '';
  const deps = dependenciasLiberacion({
    crearInventarioProductoTerminadoDesdeLiberacion: async () => {
      inventarios += 1;
    },
    actualizarAlmacenamientoDesdeLiberacion: async (_id, estado) => {
      estadoAlmacenamiento = estado;
      return { id_almacenamiento: 4, estado };
    }
  });

  const resultado = await crearLiberacionService({
    ...dataLiberacion,
    estado_liberacion: 'rechazado',
    motivo_rechazo: 'Empaque no conforme'
  }, { email: 'calidad@trazaap.local' }, deps);

  assert.equal(inventarios, 0);
  assert.equal(estadoAlmacenamiento, 'rechazado');
  assert.equal(resultado.inventario_producto_terminado, null);
});

test('no permite liberar mas unidades que las producidas', async () => {
  await assert.rejects(
    crearLiberacionService(
      { ...dataLiberacion, unidades_empacadas: 11 },
      { email: 'calidad@trazaap.local' },
      dependenciasLiberacion()
    ),
    (error) => error.status === 400 && /superar/.test(error.message)
  );
});

test('la confirmacion publica se vincula al despacho autorizado, no solamente al lote', async () => {
  let confirmaciones = 0;
  const deps = {
    buscarDespachoCliente: async ({ factura }) => (
      factura === 'FAC-100' ? { id_despacho: 20, numero_factura: 'FAC-100' } : null
    ),
    registrarConfirmacionEntregaService: async (data) => {
      confirmaciones += 1;
      return { ...data, estado: 'PENDIENTE_BLOCKCHAIN' };
    }
  };

  const confirmado = await confirmarRecepcionClienteService({
    lote: 'LT-001',
    factura: 'FAC-100',
    receptor: 'Cliente prueba',
    temperatura_entrega_c: 18
  }, deps);
  assert.equal(confirmado.id_despacho, 20);
  assert.equal(confirmado.temperatura_entrega_c, 18);
  assert.equal(confirmaciones, 1);

  await assert.rejects(
    confirmarRecepcionClienteService({
      lote: 'LT-001',
      factura: 'FACTURA-INCORRECTA',
      receptor: 'Cliente prueba',
      temperatura_entrega_c: 18
    }, deps),
    (error) => error.status === 403
  );
  assert.equal(confirmaciones, 1);
});
