import assert from 'node:assert/strict';
import { poolPostgres } from '../src/configuracion/postgresql.js';
import { procesarOutboxAhora } from '../src/modulos/blockchain/outbox.worker.js';
import { construirPayloadDespacho } from '../src/modulos/blockchain/payloads/despacho.payload.js';
import {
  consultarSaldoInventarioBlockchain,
  registrarDespachoBlockchain
} from '../src/modulos/blockchain/fabric.client.js';

const API_URL = process.env.RF05_API_URL || 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.RF05_ADMIN_EMAIL || 'admin@trazaap.local';
const ADMIN_PASSWORD = process.env.RF05_ADMIN_PASSWORD || 'Admin123*';
const sufijo = `${Date.now()}`.slice(-9);

function fechaISO(dias = 0) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

async function solicitar(path, { method = 'GET', token, body, aceptarError = false } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (!response.ok && !aceptarError) {
    throw new Error(`${method} ${path}: ${data.message || response.status}`);
  }
  return { ok: response.ok, status: response.status, data };
}

async function crearPrerrequisitosLote(indice) {
  const db = await poolPostgres.connect();
  const lote = `RF05-${sufijo}-${indice}`;
  try {
    await db.query('BEGIN');
    const orden = (await db.query(
      `INSERT INTO ordenes_produccion (
         fecha_produccion, codigo_orden, estado, observaciones, creado_por
       ) VALUES ($1, $2, 'finalizada', 'Prueba integral automatizada RF05', 1)
       RETURNING id, codigo_orden`,
      [fechaISO(), `OP-RF05-${sufijo}-${indice}`]
    )).rows[0];
    const producto = (await db.query(
      `INSERT INTO ordenes_produccion_productos (
         orden_produccion_id, producto, tamano_presentacion, cantidad_programada,
         observaciones, producto_fabricado_id, producto_variante_id, estado_manufactura
       ) VALUES ($1, 'Bagel', 'mediano', 10, 'Prueba integral RF05', 1, 4, 'registrado')
       RETURNING id`,
      [orden.id]
    )).rows[0];
    const manufactura = (await db.query(
      `INSERT INTO registro_manufactura (
         id_orden_produccion, id_producto, lote_producido, unidades_producidas,
         tiempo_real_fermentacion_minutos, temperatura_real_fermentacion_c,
         tiempo_real_horneado_minutos, temperatura_real_horneado_c,
         tiempo_real_inmersion_minutos, temperatura_real_inmersion_c,
         hora_inicio, hora_fin, observaciones, registrado_por,
         registrado_por_usuario_id, fecha_vencimiento_calculada
       ) VALUES (
         $1, $2, $3, 10, 45, 30, 15, 165, 1, 90,
         NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour',
         'Prueba integral RF05', 'operario@trazaap.local', 3, $4
       ) RETURNING id_manufactura`,
      [orden.id, producto.id, lote, fechaISO(5)]
    )).rows[0];
    await db.query(
      `INSERT INTO almacenamientos_lote (
         id_manufactura, id_orden_produccion, id_producto, lote_producido,
         id_ubicacion, temperatura_min_esperada_c, temperatura_max_esperada_c,
         temperatura_ingreso_c, estado, observaciones_ingreso, responsable_ingreso,
         fecha_salida, temperatura_salida_c, estado_producto_salida,
         decision_salida, observaciones_salida, responsable_salida
       ) VALUES (
         $1, $2, $3, $4, 1, 15, 25, 18, 'listo_para_liberacion',
         'Prueba integral RF05', 3, NOW(), 18, 'conforme', 'liberar',
         'Producto habilitado para liberacion', 3
       )`,
      [manufactura.id_manufactura, orden.id, producto.id, lote]
    );
    await db.query('COMMIT');
    return { lote, idManufactura: manufactura.id_manufactura };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

async function procesarHasta(consulta, descripcion, timeoutMs = 45000) {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    await procesarOutboxAhora();
    const valor = await consulta();
    if (valor) return valor;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Tiempo agotado esperando: ${descripcion}`);
}

async function crearLiberacion(token, lote) {
  const respuesta = await solicitar('/liberacion', {
    method: 'POST',
    token,
    body: {
      id_manufactura: lote.idManufactura,
      responsable_liberacion_usuario_id: 3,
      tipo_empaque: 'Bolsa sellada',
      unidades_empacadas: 10,
      peso_neto: 1,
      fecha_vencimiento: fechaISO(5),
      etiqueta_verificada: true,
      verificacion_envase: true,
      estado_liberacion: 'aprobado',
      motivo_retencion: '',
      motivo_rechazo: '',
      observaciones: 'Prueba integral RF05'
    }
  });
  const inventario = respuesta.data.inventario_producto_terminado;
  assert.equal(Number(inventario.unidades_disponibles), 10);
  await procesarHasta(async () => {
    const { rows } = await poolPostgres.query(
      `SELECT estado FROM blockchain_outbox
       WHERE operacion = 'inicializar_inventario_terminado' AND id_entidad = $1`,
      [String(inventario.id_inventario)]
    );
    if (rows[0]?.estado === 'fallido') throw new Error(`Fabric rechazo la inicializacion de ${lote.lote}`);
    return rows[0]?.estado === 'enviado';
  }, `inicializacion Fabric de ${lote.lote}`);
  return inventario;
}

async function crearCliente(token, indice) {
  return (await solicitar('/clientes', {
    method: 'POST',
    token,
    body: {
      nombre_razon_social: `Cliente RF05 ${indice} ${sufijo}`,
      nit_documento: `RF05-${sufijo}-${indice}`,
      nombre_contacto: `Contacto ${indice}`,
      telefono: `30000000${indice}`,
      email: `rf05-${sufijo}-${indice}@example.test`,
      direccion: `Direccion de prueba ${indice}`,
      estado: 'activo'
    }
  })).data;
}

function datosDespacho(cliente, factura, detalles) {
  return {
    id_cliente: Number(cliente.id_cliente),
    numero_factura: factura,
    fecha_despacho: new Date().toISOString(),
    conductor: 'Conductor RF05',
    placa_vehiculo: 'RF0505',
    temperatura_salida_c: 18,
    temperatura_transporte_c: 19,
    limpieza_vehiculo: 'cumple',
    documentacion_dotacion: 'cumple',
    canal_distribucion: 'Venta directa',
    observaciones: 'Prueba integral automatizada',
    detalles
  };
}

async function esperarDespacho(idDespacho) {
  return procesarHasta(async () => {
    const { rows } = await poolPostgres.query(
      'SELECT * FROM despachos WHERE id_despacho = $1',
      [idDespacho]
    );
    if (rows[0]?.estado_despacho === 'bloqueado') {
      throw new Error(`Despacho bloqueado: ${rows[0].motivo_bloqueo}`);
    }
    return ['despachado', 'entregado'].includes(rows[0]?.estado_despacho) ? rows[0] : null;
  }, `despacho ${idDespacho}`);
}

async function crearYConfirmarDespacho(token, data) {
  const respuesta = await solicitar('/despachos', { method: 'POST', token, body: data });
  assert.equal(respuesta.status, 202);
  await esperarDespacho(respuesta.data.id_despacho);
  return respuesta.data;
}

async function saldoPostgres(idInventario) {
  const { rows } = await poolPostgres.query(
    `SELECT unidades_liberadas, unidades_reservadas, unidades_despachadas,
            unidades_disponibles, estado
     FROM inventario_producto_terminado WHERE id_inventario = $1`,
    [idInventario]
  );
  return rows[0];
}

async function main() {
  const health = await solicitar('/health');
  assert.equal(health.data.status, 'ok');
  const login = await solicitar('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  const token = login.data.token;

  const [loteA, loteB] = await Promise.all([crearPrerrequisitosLote(1), crearPrerrequisitosLote(2)]);
  const inventarioA = await crearLiberacion(token, loteA);
  const inventarioB = await crearLiberacion(token, loteB);
  const [clienteA, clienteB] = await Promise.all([crearCliente(token, 1), crearCliente(token, 2)]);

  const despacho1 = await crearYConfirmarDespacho(token, datosDespacho(clienteA, `FAC-${sufijo}-1`, [
    { id_inventario_producto_terminado: inventarioA.id_inventario, cantidad_despachada: 3 }
  ]));
  let saldoA = await saldoPostgres(inventarioA.id_inventario);
  assert.deepEqual(
    [Number(saldoA.unidades_despachadas), Number(saldoA.unidades_disponibles), saldoA.estado],
    [3, 7, 'despacho_parcial']
  );

  await crearYConfirmarDespacho(token, datosDespacho(clienteB, `FAC-${sufijo}-2`, [
    { id_inventario_producto_terminado: inventarioA.id_inventario, cantidad_despachada: 4 }
  ]));
  saldoA = await saldoPostgres(inventarioA.id_inventario);
  assert.deepEqual([Number(saldoA.unidades_despachadas), Number(saldoA.unidades_disponibles)], [7, 3]);

  const concurrentes = await Promise.all([
    solicitar('/despachos', {
      method: 'POST', token, aceptarError: true,
      body: datosDespacho(clienteA, `FAC-${sufijo}-C1`, [
        { id_inventario_producto_terminado: inventarioB.id_inventario, cantidad_despachada: 7 }
      ])
    }),
    solicitar('/despachos', {
      method: 'POST', token, aceptarError: true,
      body: datosDespacho(clienteB, `FAC-${sufijo}-C2`, [
        { id_inventario_producto_terminado: inventarioB.id_inventario, cantidad_despachada: 7 }
      ])
    })
  ]);
  assert.equal(concurrentes.filter((item) => item.ok).length, 1);
  assert.equal(concurrentes.filter((item) => !item.ok && item.data.codigo === 'STOCK_INSUFICIENTE').length, 1);
  await esperarDespacho(concurrentes.find((item) => item.ok).data.id_despacho);

  const despachoFinal = await crearYConfirmarDespacho(token, datosDespacho(clienteB, `FAC-${sufijo}-FINAL`, [
    { id_inventario_producto_terminado: inventarioA.id_inventario, cantidad_despachada: 3 },
    { id_inventario_producto_terminado: inventarioB.id_inventario, cantidad_despachada: 3 }
  ]));

  saldoA = await saldoPostgres(inventarioA.id_inventario);
  const saldoB = await saldoPostgres(inventarioB.id_inventario);
  assert.deepEqual([Number(saldoA.unidades_despachadas), Number(saldoA.unidades_disponibles), saldoA.estado], [10, 0, 'despachado_total']);
  assert.deepEqual([Number(saldoB.unidades_despachadas), Number(saldoB.unidades_disponibles), saldoB.estado], [10, 0, 'despachado_total']);

  const rechazadoPostgres = await solicitar('/despachos', {
    method: 'POST', token, aceptarError: true,
    body: datosDespacho(clienteA, `FAC-${sufijo}-SIN-STOCK`, [
      { id_inventario_producto_terminado: inventarioA.id_inventario, cantidad_despachada: 1 }
    ])
  });
  assert.equal(rechazadoPostgres.status, 409);
  assert.equal(rechazadoPostgres.data.codigo, 'LOTE_SIN_EXISTENCIAS');

  const payloadFinal = await construirPayloadDespacho(despachoFinal.id_despacho);
  await assert.rejects(
    registrarDespachoBlockchain({
      ...payloadFinal,
      idEntidad: `RF05-SIN-STOCK-${sufijo}`,
      codigoDespacho: `DES-RF05-SIN-STOCK-${sufijo}`,
      numeroFactura: `FAC-RF05-SIN-STOCK-${sufijo}`,
      detalles: [{ ...payloadFinal.detalles[0], cantidadDespachada: 1 }]
    }),
    (error) => error.codigo === 'LOTE_SIN_EXISTENCIAS'
  );

  const saldoFabricA = await consultarSaldoInventarioBlockchain(inventarioA.id_inventario);
  const saldoFabricB = await consultarSaldoInventarioBlockchain(inventarioB.id_inventario);
  assert.equal(Number(saldoFabricA.unidadesDisponibles), 0);
  assert.equal(Number(saldoFabricB.unidadesDisponibles), 0);

  const confirmacion = await solicitar('/public/traceability/cliente/confirmar', {
    method: 'POST',
    body: {
      lote: loteA.lote,
      id_despacho: despacho1.id_despacho,
      factura: `FAC-${sufijo}-1`,
      receptor: 'Receptor RF05',
      temperatura_entrega_c: 18,
      observaciones: 'Entrega conforme'
    }
  });
  await procesarHasta(async () => {
    const { rows } = await poolPostgres.query(
      'SELECT estado_confirmacion FROM confirmaciones_entrega WHERE id_confirmacion = $1',
      [confirmacion.data.id_confirmacion]
    );
    return rows[0]?.estado_confirmacion === 'confirmada';
  }, 'confirmacion del cliente');

  const accesoInvalido = await solicitar(
    `/public/traceability/cliente?lote=${encodeURIComponent(loteA.lote)}&factura=INCORRECTA`,
    { aceptarError: true }
  );
  assert.equal(accesoInvalido.status, 403);

  console.log(JSON.stringify({
    resultado: 'RF05_VERIFICADO',
    lotes: [loteA.lote, loteB.lote],
    clientes: [clienteA.nombre_razon_social, clienteB.nombre_razon_social],
    saldosPostgres: { [loteA.lote]: saldoA, [loteB.lote]: saldoB },
    saldosFabric: { [loteA.lote]: saldoFabricA, [loteB.lote]: saldoFabricB },
    pruebas: {
      despachosParciales: '3 + 4 + 3',
      despachoMultilote: despachoFinal.codigo_despacho,
      concurrencia: 'una solicitud aceptada y una rechazada',
      sinExistenciasPostgres: rechazadoPostgres.data.codigo,
      sinExistenciasFabric: 'LOTE_SIN_EXISTENCIAS',
      confirmacionCliente: 'confirmada'
    }
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await poolPostgres.end();
  });
