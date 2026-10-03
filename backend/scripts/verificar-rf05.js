import assert from 'node:assert/strict';
import { poolPostgres } from '../src/configuracion/postgresql.js';
import { procesarOutboxAhora } from '../src/modulos/blockchain/outbox.worker.js';
import {
  consultarSaldoInventarioBlockchain,
  registrarDespachoBlockchain
} from '../src/modulos/blockchain/fabric.client.js';
import { construirPayloadDespacho } from '../src/modulos/blockchain/payloads/despacho.payload.js';

const API_URL = process.env.RF05_API_URL || 'http://localhost:4000/api';
const FRONTEND_URL = process.env.RF05_FRONTEND_URL || 'http://localhost:3000';
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

async function solicitarArchivo(path, { token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`POST ${path}: ${response.status}`);
  return { contentType: response.headers.get('content-type') || '', bytes: (await response.arrayBuffer()).byteLength };
}

async function comprobarVistaFrontend(path) {
  const response = await fetch(`${FRONTEND_URL}${path}`);
  if (!response.ok) throw new Error(`La vista frontend ${path} respondió ${response.status}`);
  return response;
}

async function crearPrerrequisitosLote(indice, { adminToken, operarioToken }) {
  const usuarios = (await poolPostgres.query(
    `SELECT id FROM users WHERE email = 'operario@trazaap.local' LIMIT 1`
  )).rows[0];
  if (!usuarios?.id) throw new Error('La base aislada no tiene el operario de prueba');

  const proveedor = (await solicitar('/providers', {
    method: 'POST',
    token: adminToken,
    body: {
      nombre: `Proveedor RF05 ${sufijo}-${indice}`,
      nit: `RF05${sufijo}${indice}`,
      nombre_contacto: 'Contacto RF05',
      telefono: '3000000000',
      email: `proveedor.rf05.${sufijo}.${indice}@trazaap.local`,
      direccion: 'Direccion de prueba RF05',
      certificaciones: 'Certificacion de prueba',
      estado: 'activo'
    }
  })).data;

  const materiaPrima = (await solicitar('/materias-primas', {
    method: 'POST',
    token: adminToken,
    body: {
      nombre: `Harina RF05 ${sufijo}-${indice}`,
      descripcion: 'Materia prima creada por la prueba integral',
      unidad_medida_base: 'kilogramos',
      tipo_insumo: 'solido',
      condiciones_almacenamiento: 'Ambiente seco',
      proveedor_id: proveedor.id,
      is_active: true
    }
  })).data;

  const producto = (await solicitar('/produccion/productos', {
    method: 'POST',
    token: adminToken,
    body: {
      nombre: `Producto RF05 ${sufijo}-${indice}`,
      prefijo_lote: `R${indice}`,
      categoria: 'Panificacion',
      descripcion: 'Producto creado por la prueba integral',
      vida_util_dias: 5,
      condiciones_almacenamiento: 'Ambiente seco',
      temperatura_almacenamiento_min_c: 15,
      temperatura_almacenamiento_max_c: 25,
      requiere_refrigeracion: false,
      requiere_inmersion: false,
      tiempo_fermentacion_minutos: 45,
      temperatura_fermentacion_c: 30,
      tiempo_horneado_minutos: 15,
      temperatura_horneado_c: 165,
      estado: 'activo',
      variantes: [{
        tamano_presentacion: 'mediano',
        peso_estimado_unidad: 500,
        unidad_medida: 'unidad',
        estado: 'activo',
        receta: [{
          materia_prima_id: materiaPrima.id,
          cantidad_requerida: 0.5,
          observaciones: 'Receta de prueba RF05'
        }]
      }]
    }
  })).data;
  const variante = producto.variantes?.[0];
  if (!variante?.id) throw new Error('La prueba no pudo recuperar la variante del producto creado');

  const recepcion = (await solicitar('/receptions', {
    method: 'POST',
    token: operarioToken,
    body: {
      proveedor_id: proveedor.id,
      materia_prima_id: materiaPrima.id,
      cantidad: 100,
      unidad_medida: 'kilogramos',
      presentacion: 'bulto',
      numero_lote: `MP-RF05-${sufijo}-${indice}`,
      fecha_vencimiento: fechaISO(120),
      temperatura: 20,
      observaciones: 'Recepcion creada por la prueba integral',
      recibido_por: usuarios.id,
      estado_recepcion: 'aceptado',
      inspeccion_producto: {
        olor: true,
        color: true,
        textura: true,
        estado_empaque: true,
        certificado_calidad: true,
        observaciones_producto: 'Producto conforme',
        decision_producto: 'aceptado'
      },
      inspeccion_transporte: {
        condiciones_vehiculo: true,
        higiene_conductor: true,
        observaciones_transporte: 'Transporte conforme'
      }
    }
  })).data;

  const orden = (await solicitar('/produccion/ordenes', {
    method: 'POST',
    token: adminToken,
    body: {
      fecha_produccion: fechaISO(),
      codigo_orden: `OP-RF05-${sufijo}-${indice}`,
      estado: 'pendiente',
      observaciones: 'Orden creada por la prueba integral RF05',
      productos: [{
        producto_id: producto.id,
        variante_id: variante.id,
        cantidad_programada: 10,
        observaciones: 'Producto programado RF05'
      }]
    }
  })).data;
  const productoOrden = orden.productos?.[0];
  if (!productoOrden?.id) throw new Error('La prueba no pudo recuperar el producto de la orden');

  const manufactura = (await solicitar(`/produccion/ordenes/${orden.id}/productos/${productoOrden.id}/manufactura`, {
    method: 'POST',
    token: operarioToken,
    body: {
      responsable_usuario_id: usuarios.id,
      unidades_producidas: 10,
      tiempo_real_fermentacion_minutos: 45,
      temperatura_real_fermentacion_c: 30,
      tiempo_real_horneado_minutos: 15,
      temperatura_real_horneado_c: 165,
      hora_inicio: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      hora_fin: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      equipos_utilizados: ['Horno de prueba RF05'],
      observaciones: 'Manufactura creada por la prueba integral'
    }
  })).data;
  const manufacturaRegistro = manufactura.registro;
  const lote = manufacturaRegistro.lote_producido;

  const ubicacion = (await solicitar('/almacenamiento/ubicaciones', {
    method: 'POST',
    token: adminToken,
    body: {
      nombre: `Ubicacion RF05 ${sufijo}-${indice}`,
      descripcion: 'Ubicacion temporal de prueba',
      tipo: 'ambiente',
      activo: true
    }
  })).data;
  const almacenamiento = (await solicitar('/almacenamiento/ingresos', {
    method: 'POST',
    token: operarioToken,
    body: { id_manufactura: manufacturaRegistro.id_manufactura, id_ubicacion: ubicacion.id_ubicacion, temperatura_ingreso_c: 20, observaciones: 'Ingreso RF05' }
  })).data;
  await solicitar(`/almacenamiento/${almacenamiento.id_almacenamiento}/controles`, {
    method: 'POST',
    token: operarioToken,
    body: { temperatura_c: 20, condicion_general: 'conforme', observaciones: 'Control RF05 conforme' }
  });
  await solicitar(`/almacenamiento/${almacenamiento.id_almacenamiento}/salida`, {
    method: 'POST',
    token: operarioToken,
    body: { temperatura_salida_c: 20, estado_producto_salida: 'conforme', decision_salida: 'liberar', observaciones: 'Salida RF05 conforme' }
  });

  return {
    lote,
    idManufactura: manufacturaRegistro.id_manufactura,
    responsableId: usuarios.id,
    recepcionId: recepcion.recepcion?.id || recepcion.id,
    inspeccionId: recepcion.inspeccion?.id || null,
    proveedorId: proveedor.id,
    materiaPrimaId: materiaPrima.id,
    productoId: producto.id,
    ordenId: orden.id
  };
}

async function procesarHasta(consulta, descripcion, timeoutMs = 120000) {
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
      responsable_liberacion_usuario_id: lote.responsableId,
      tipo_empaque: 'Bolsa sellada',
      unidades_empacadas: 10,
      peso_neto: 1,
      fecha_vencimiento: fechaISO(5),
      etiqueta_verificada: true,
      verificacion_envase: true,
      lote_visible: true,
      fecha_vencimiento_visible: true,
      empaque_conforme: true,
      producto_en_buen_estado: true,
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
       `SELECT estado, ultimo_error FROM blockchain_outbox
       WHERE operacion = 'inicializar_inventario_terminado' AND id_entidad = $1`,
      [String(inventario.id_inventario)]
    );
    if (rows[0]?.estado === 'fallido') {
      throw new Error(`Fabric rechazo la inicializacion de ${lote.lote}: ${rows[0].ultimo_error || 'sin detalle'}`);
    }
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
  const operarioLogin = await solicitar('/auth/login', {
    method: 'POST',
    body: { email: 'operario@trazaap.local', password: process.env.RF05_OPERARIO_PASSWORD || 'Operario123*' }
  });
  const operarioToken = operarioLogin.data.token;
  const loteA = await crearPrerrequisitosLote(1, { adminToken: token, operarioToken });
  const loteB = await crearPrerrequisitosLote(2, { adminToken: token, operarioToken });
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

  const consultaPublica = await solicitar(`/public/traceability/lote/${encodeURIComponent(loteA.lote)}`);
  assert.equal(consultaPublica.data.lote, loteA.lote);
  assert.ok(Array.isArray(consultaPublica.data.eventos));
  const consultaInterna = await solicitar(`/traceability/lote/${encodeURIComponent(loteA.lote)}`, { token });
  const validaciones = consultaInterna.data.validacionesBlockchain || [];
  assert.ok(validaciones.length >= 8);
  const estadosBlockchain = validaciones.map((item) => `${item.tipoEvento}:${item.idEntidad}=${item.estadoBlockchain}`);
  assert.ok(
    validaciones.every((item) => ['VERIFICADO', 'VERIFICADO_CORREGIDO'].includes(item.estadoBlockchain)),
    `Estados blockchain inesperados: ${estadosBlockchain.join(', ')}`
  );

  const reporteMultilote = await solicitar('/reportes/multilote', {
    method: 'POST', token, body: { lotes: [loteA.lote, loteB.lote] }
  });
  assert.equal(reporteMultilote.data.encontrados, 2);
  const excel = await solicitarArchivo('/reportes/multilote/excel', { token, body: { lotes: [loteA.lote] } });
  assert.match(excel.contentType, /spreadsheetml/);
  assert.ok(excel.bytes > 100);
 await comprobarVistaFrontend(`/reportes/trazabilidad/${encodeURIComponent(loteA.lote)}`);

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
      confirmacionCliente: 'confirmada',
      consultaPublica: 'verificada',
      reporteExcel: 'generado',
      vistaInternaPorLoteYReporte: 'disponibles'
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
