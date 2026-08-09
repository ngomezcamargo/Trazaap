import assert from 'node:assert/strict';
import test from 'node:test';
import { ErrorOperacionFabric } from '../src/modulos/blockchain/fabric.client.js';
import { crearLiberacionService } from '../src/modulos/liberacion/liberacion.service.js';
import { confirmarRecepcionClienteService } from '../src/modulos/publico/publico.service.js';

const dataLiberacion = {
  id_manufactura: 8,
  responsable_liberacion_usuario_id: 3,
  tipo_empaque: 'Bolsa sellada',
  numero_factura: 'FAC-100',
  conductor: 'Conductor prueba',
  placa_vehiculo: 'ABC123',
  limpieza_vehiculo: 'cumple',
  documentacion_dotacion: 'cumple',
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
  unidades_producidas: 10,
  requiere_inmersion: true,
  tiempo_fermentacion_minutos: 30,
  temperatura_fermentacion_c: 28,
  tiempo_horneado_minutos: 20,
  temperatura_horneado_c: 180,
  tiempo_inmersion_minutos: 2,
  temperatura_inmersion_c: 90,
  tiempo_real_fermentacion_minutos: 30,
  temperatura_real_fermentacion_c: 28,
  tiempo_real_horneado_minutos: 20,
  temperatura_real_horneado_c: 180,
  tiempo_real_inmersion_minutos: 2,
  temperatura_real_inmersion_c: 90
};

function dependenciasBase(overrides = {}) {
  return {
    buscarManufacturaPorId: async () => manufactura,
    buscarLiberacionPorManufactura: async () => null,
    buscarUsuarioOperarioPorId: async () => ({ id: 3, email: 'operario@trazaap.local' }),
    validarDespachoCritico: async () => ({ permitido: true, estado: 'APROBADO', motivos: [] }),
    ejecutarTransaccionLiberacion: async (callback) => callback({ query: async () => ({ rows: [] }) }),
    crearLiberacionProducto: async () => ({
      ...dataLiberacion,
      id_liberacion: 5,
      id_orden_produccion: 17,
      id_producto: 2,
      lote_producido: 'LT-001',
      unidades_producidas: 10,
      fecha_liberacion: new Date().toISOString()
    }),
    registrarDespachoCritico: async () => ({
      estado: 'DESPACHADO',
      transactionId: 'tx-despacho',
      decisionChaincode: { permitido: true, estado: 'APROBADO', motivos: [] }
    }),
    crearInventarioProductoTerminadoDesdeLiberacion: async () => ({ id_inventario: 2 }),
    registrarEventoTrazabilidad: async () => {},
    registrarEventoCritico: async () => ({ estado: 'REGISTRADO' }),
    ...overrides
  };
}

test('devuelve 503 y no escribe si Fabric no esta disponible al validar despacho', async () => {
  let transacciones = 0;
  let inventarios = 0;
  const deps = dependenciasBase({
    validarDespachoCritico: async () => {
      throw new ErrorOperacionFabric('FABRIC_NO_DISPONIBLE', 'Fabric no disponible', 503);
    },
    ejecutarTransaccionLiberacion: async () => {
      transacciones += 1;
    },
    crearInventarioProductoTerminadoDesdeLiberacion: async () => {
      inventarios += 1;
    }
  });

  await assert.rejects(
    crearLiberacionService(dataLiberacion, { email: 'operario@trazaap.local' }, deps),
    (error) => error.status === 503
  );
  assert.equal(transacciones, 0);
  assert.equal(inventarios, 0);
});

test('un despacho bloqueado no descuenta inventario ni crea liberacion', async () => {
  let liberaciones = 0;
  let inventarios = 0;
  const deps = dependenciasBase({
    validarDespachoCritico: async () => ({
      permitido: false,
      estado: 'BLOQUEADO',
      motivos: ['Temperatura de horneado fuera del rango permitido']
    }),
    crearLiberacionProducto: async () => {
      liberaciones += 1;
    },
    crearInventarioProductoTerminadoDesdeLiberacion: async () => {
      inventarios += 1;
    }
  });

  await assert.rejects(
    crearLiberacionService(dataLiberacion, { email: 'operario@trazaap.local' }, deps),
    (error) => error.status === 422 && error.details.motivos.length === 1
  );
  assert.equal(liberaciones, 0);
  assert.equal(inventarios, 0);
});

test('un error al registrar despacho revierte la transaccion operativa', async () => {
  let committed = false;
  let inventoryWrites = 0;
  const deps = dependenciasBase({
    ejecutarTransaccionLiberacion: async (callback) => {
      try {
        const result = await callback({ query: async () => ({ rows: [] }) });
        committed = true;
        return result;
      } catch (error) {
        committed = false;
        throw error;
      }
    },
    registrarDespachoCritico: async () => {
      throw new ErrorOperacionFabric('FABRIC_NO_DISPONIBLE', 'Fabric no disponible', 503);
    },
    crearInventarioProductoTerminadoDesdeLiberacion: async () => {
      inventoryWrites += 1;
    }
  });

  await assert.rejects(
    crearLiberacionService(dataLiberacion, { email: 'operario@trazaap.local' }, deps),
    (error) => error.status === 503
  );
  assert.equal(committed, false);
  assert.equal(inventoryWrites, 0);
});

function trazabilidadCliente() {
  return {
    lote: 'LT-001',
    liberacion: {
      id_liberacion: 5,
      numero_factura: 'FAC-100',
      estado_liberacion: 'aprobado'
    },
    produccion: { orden: {}, manufactura: {} }
  };
}

test('la confirmacion publica solo llega a Fabric con credenciales validas', async () => {
  let llamadasFabric = 0;
  const deps = {
    consultarTrazabilidadPorLote: async () => trazabilidadCliente(),
    confirmarRecepcionEnFabric: async () => {
      llamadasFabric += 1;
      return { estado: 'RECIBIDO_POR_CLIENTE', transactionId: 'tx-confirmacion' };
    }
  };

  const confirmado = await confirmarRecepcionClienteService({
    lote: 'LT-001',
    factura: 'FAC-100',
    receptor: 'Cliente prueba'
  }, deps);
  assert.equal(confirmado.confirmado, true);
  assert.equal(llamadasFabric, 1);

  await assert.rejects(
    confirmarRecepcionClienteService({
      lote: 'LT-001',
      factura: 'FACTURA-INCORRECTA',
      receptor: 'Cliente prueba'
    }, deps),
    (error) => error.status === 403
  );
  assert.equal(llamadasFabric, 1);
});
