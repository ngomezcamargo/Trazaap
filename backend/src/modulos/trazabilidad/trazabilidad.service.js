import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  consultarHistorialCritico,
  consultarEventosPorLote,
  registrarCorreccionCritica,
  validarEventoCritico,
  validarEventoInspeccion,
  validarEventoRecepcion
} from '../blockchain/blockchain.service.js';
import {
  buscarOrdenPorLoteFinalOLoteRecepcion,
  buscarTrazabilidadRecepcionPorLote,
  listarEventosPorLote,
  obtenerDetalleProduccion
} from './trazabilidad.repository.js';
import { generarCodigosAcceso } from '../publico/codigos-acceso.util.js';
import { buscarDespachosPorLote } from '../despachos/despachos.repository.js';
import { listarEnvasados } from '../envasado/envasado.repository.js';

async function construirValidacionesBlockchain(recepcion) {
  if (!recepcion) return [];

  const validaciones = [await validarEventoRecepcion(recepcion)];
  const validacionInspeccion = await validarEventoInspeccion(recepcion);

  if (validacionInspeccion) validaciones.push(validacionInspeccion);
  return validaciones;
}

async function validarSeguro(tipoEvento, idEntidad) {
  if (!idEntidad) return null;
  try {
    return await validarEventoCritico(tipoEvento, idEntidad);
  } catch (error) {
    return {
      tipoEvento,
      idEntidad: String(idEntidad),
      estadoBlockchain: 'PENDIENTE',
      valido: false,
      mensaje: `No fue posible validar evidencia blockchain: ${error.message}`
    };
  }
}

async function consultarHistorialSeguro(validacion) {
  if (!validacion?.tipoEvento || !validacion?.idEntidad) return [];
  try {
    const historial = await consultarHistorialCritico(validacion.tipoEvento, validacion.idEntidad);
    return historial?.correcciones || [];
  } catch {
    return [];
  }
}

function normalizarRecepcionDesdeMateria(materia) {
  return {
    id: materia.recepcion_id,
    recepcion_id: materia.recepcion_id,
    fecha_recepcion: materia.fecha_recepcion,
    lote_proveedor: materia.lote_proveedor,
    numero_lote: materia.numero_lote,
    estado_recepcion: materia.estado_recepcion,
    cantidad: materia.recepcion_cantidad,
    unidad_presentacion: materia.unidad_presentacion,
    unidad_medida: materia.unidad_medida,
    presentacion: materia.presentacion,
    fecha_vencimiento: materia.fecha_vencimiento,
    recibido_por: materia.recibido_por,
    temperatura_recepcion: materia.temperatura_recepcion,
    peso_recibido: materia.peso_recibido,
    recepcion_observaciones: materia.recepcion_observaciones,
    proveedor_id: materia.proveedor_id,
    proveedor_nombre: materia.proveedor_nombre,
    proveedor_nit: materia.proveedor_nit,
    materia_prima_id: materia.materia_prima_id,
    materia_prima: materia.materia_prima,
    inspeccion_id: materia.inspeccion_id,
    olor: materia.olor,
    color: materia.color,
    textura: materia.textura,
    estado_empaque: materia.estado_empaque,
    certificado_calidad: materia.certificado_calidad,
    inspeccion_transporte: materia.inspeccion_transporte,
    condiciones_vehiculo: materia.condiciones_vehiculo,
    higiene_conductor: materia.higiene_conductor,
    inspeccion_observaciones: materia.inspeccion_observaciones,
    observaciones_producto: materia.observaciones_producto,
    observaciones_transporte: materia.observaciones_transporte,
    inspeccionado_por: materia.inspeccionado_por,
    decision_final: materia.decision_final,
    inspeccionado_en: materia.inspeccionado_en
  };
}

function deduplicarRecepciones(recepciones) {
  const map = new Map();
  for (const recepcion of recepciones.filter(Boolean)) {
    if (!map.has(recepcion.recepcion_id)) map.set(recepcion.recepcion_id, recepcion);
  }
  return [...map.values()];
}

function deduplicarEventosFabric(eventos) {
  const map = new Map();
  for (const evento of eventos.flat().filter(Boolean)) {
    const key = evento.txId || `${evento.tipoEvento}:${evento.idEntidad}`;
    if (!map.has(key)) map.set(key, evento);
  }
  return [...map.values()].sort((a, b) => (
    String(a.timestampBlockchain || '').localeCompare(String(b.timestampBlockchain || ''))
  ));
}

function mapearRecepcion(recepcion, blockchainPorEntidad) {
  if (!recepcion) return null;
  return {
    id: recepcion.recepcion_id,
    fecha_recepcion: recepcion.fecha_recepcion,
    numero_lote: recepcion.numero_lote || recepcion.lote_proveedor,
    lote_proveedor: recepcion.lote_proveedor,
    estado_recepcion: recepcion.estado_recepcion,
    cantidad: recepcion.cantidad,
    unidad_presentacion: recepcion.unidad_presentacion,
    unidad_medida: recepcion.unidad_medida,
    temperatura_recepcion: recepcion.temperatura_recepcion,
    peso_recibido: recepcion.peso_recibido,
    observaciones: recepcion.recepcion_observaciones,
    materia_prima: recepcion.materia_prima,
    proveedor: {
      id: recepcion.proveedor_id,
      nombre: recepcion.proveedor_nombre,
      nit: recepcion.proveedor_nit
    },
    blockchain: blockchainPorEntidad[`recepcion_materia_prima:${recepcion.recepcion_id}`] || null
  };
}

function mapearInspeccion(recepcion, blockchainPorEntidad) {
  if (!recepcion?.inspeccion_id) return null;
  return {
    id: recepcion.inspeccion_id,
    recepcion_id: recepcion.recepcion_id,
    decision_final: recepcion.decision_final,
    olor: recepcion.olor,
    color: recepcion.color,
    textura: recepcion.textura,
    estado_empaque: recepcion.estado_empaque,
    certificado_calidad: recepcion.certificado_calidad,
    inspeccion_transporte: recepcion.inspeccion_transporte,
    condiciones_vehiculo: recepcion.condiciones_vehiculo,
    higiene_conductor: recepcion.higiene_conductor,
    observaciones: recepcion.inspeccion_observaciones,
    observaciones_producto: recepcion.observaciones_producto,
    observaciones_transporte: recepcion.observaciones_transporte,
    inspeccionado_en: recepcion.inspeccionado_en,
    blockchain: blockchainPorEntidad[`inspeccion_recepcion:${recepcion.inspeccion_id}`] || null
  };
}

export async function consultarTrazabilidadPorLote(lote) {
  const orden = await buscarOrdenPorLoteFinalOLoteRecepcion(lote);
  const recepcionDirecta = await buscarTrazabilidadRecepcionPorLote(lote);

  if (!recepcionDirecta && !orden) throw new ErrorHttp(404, 'No hay informacion de trazabilidad para ese lote');

  const detalle = orden ? await obtenerDetalleProduccion(orden.id, lote) : null;
  const recepcionesOrigen = deduplicarRecepciones([
    ...(detalle?.materias || []).map(normalizarRecepcionDesdeMateria),
    recepcionDirecta
  ]);
  const recepcionPrincipal = recepcionesOrigen[0] || null;
  const lotes = [
    lote,
    ...(detalle?.manufactura?.lote_producido ? [detalle.manufactura.lote_producido] : []),
    ...new Set((detalle?.materias || []).map((m) => m.lote_proveedor).filter(Boolean))
  ];

  const [eventos, eventosFabric] = await Promise.all([
    Promise.all(lotes.map((value) => listarEventosPorLote(value))).then((items) => items.flat()),
    Promise.all(lotes.map((value) => consultarEventosPorLote(value))).then(deduplicarEventosFabric)
  ]);
  const validacionesBlockchain = (await Promise.all(
    [
      ...recepcionesOrigen.map((recepcion) => construirValidacionesBlockchain(recepcion)),
      orden ? validarSeguro('orden_produccion', orden.id) : null,
      ...(detalle?.productos || [])
        .filter((producto) => producto.producto_fabricado_id)
        .map((producto) => validarSeguro('producto_fabricado_configurado', producto.producto_fabricado_id)),
      detalle?.manufactura?.id_manufactura
        ? validarSeguro('registro_manufactura', detalle.manufactura.id_manufactura)
        : null,
      ...(detalle?.manufactura?.lote_producido ? (await listarEnvasados(detalle.manufactura.lote_producido)) : [])
        .map((envasado) => validarSeguro('envasado_embalado', envasado.id_envasado)),
      detalle?.almacenamiento?.id_almacenamiento
        ? validarSeguro('ingreso_almacenamiento', detalle.almacenamiento.id_almacenamiento)
        : null,
      ...(detalle?.almacenamiento?.controles || [])
        .map((control) => validarSeguro('control_almacenamiento', control.id_control)),
      detalle?.almacenamiento?.fecha_salida
        ? validarSeguro('salida_almacenamiento', detalle.almacenamiento.id_almacenamiento)
        : null,
      detalle?.liberacion?.id_liberacion
        ? validarSeguro('liberacion_producto', detalle.liberacion.id_liberacion)
        : null,
      detalle?.inventarioProductoTerminado?.id_inventario
        ? validarSeguro('inventario_producto_terminado', detalle.inventarioProductoTerminado.id_inventario)
        : null,
      ...(detalle?.inventariosMateriaPrima || [])
        .filter((inventario) => inventario.id)
        .map((inventario) => validarSeguro('inventario_materia_prima', inventario.id)),
      ...(detalle?.movimientosInventario || [])
        .filter((movimiento) => movimiento.id)
        .map((movimiento) => validarSeguro('movimiento_inventario', movimiento.id))
    ].filter(Boolean)
  )).flat().filter(Boolean);
  const blockchainPorEntidad = validacionesBlockchain.reduce((acc, item) => {
    acc[`${item.tipoEvento}:${item.idEntidad}`] = item;
    return acc;
  }, {});
  const correccionesPorEntidad = (await Promise.all(
    validacionesBlockchain
      .filter((item) => item.estadoBlockchain === 'VERIFICADO_CORREGIDO')
      .map(consultarHistorialSeguro)
  )).flat();
  const historialCorrecciones = deduplicarEventosFabric([
    eventosFabric.filter((evento) => evento.tipoEvento === 'correccion_evento'),
    correccionesPorEntidad
  ]);
  const loteProducido = detalle?.manufactura?.lote_producido || null;
  const envasados = loteProducido ? await listarEnvasados(loteProducido) : [];
  const despachosOperativos = loteProducido ? await buscarDespachosPorLote(loteProducido) : [];
  const recepciones = recepcionesOrigen.map((recepcion) => mapearRecepcion(recepcion, blockchainPorEntidad));
  const inspecciones = recepcionesOrigen.map((recepcion) => mapearInspeccion(recepcion, blockchainPorEntidad)).filter(Boolean);

  const resultado = {
    lote: loteProducido || lote,
    loteConsultado: lote,
    tipoConsulta: loteProducido ? 'lote_producido' : 'lote_materia_prima',
    proveedor: recepcionPrincipal
      ? { id: recepcionPrincipal.proveedor_id, nombre: recepcionPrincipal.proveedor_nombre, nit: recepcionPrincipal.proveedor_nit }
      : null,
    recepcion: mapearRecepcion(recepcionPrincipal, blockchainPorEntidad),
    inspeccion: mapearInspeccion(recepcionPrincipal, blockchainPorEntidad),
    recepciones,
    inspecciones,
    produccion: orden
      ? {
          orden: orden,
          productos: detalle.productos,
          ingredientes: detalle.materias,
          tiempos: detalle.tiempos,
          manufactura: detalle.manufactura
        }
      : null,
    liberacion: detalle?.liberacion || null,
    envasados: envasados.map((envasado) => ({
      ...envasado,
      blockchain: blockchainPorEntidad[`envasado_embalado:${envasado.id_envasado}`] || null
    })),
    almacenamiento: detalle?.almacenamiento
      ? {
          ...detalle.almacenamiento,
          blockchainIngreso: blockchainPorEntidad[`ingreso_almacenamiento:${detalle.almacenamiento.id_almacenamiento}`] || null,
          blockchainSalida: blockchainPorEntidad[`salida_almacenamiento:${detalle.almacenamiento.id_almacenamiento}`] || null,
          controles: (detalle.almacenamiento.controles || []).map((control) => ({
            ...control,
            blockchain: blockchainPorEntidad[`control_almacenamiento:${control.id_control}`] || null
          }))
        }
      : null,
    inventarioProductoTerminado: detalle?.inventarioProductoTerminado
      ? {
          ...detalle.inventarioProductoTerminado,
          blockchain: blockchainPorEntidad[`inventario_producto_terminado:${detalle.inventarioProductoTerminado.id_inventario}`] || null
        }
      : null,
    despachos: despachosOperativos.map((despacho) => ({
      ...despacho,
      blockchain: eventosFabric.find((evento) => (
        evento.tipoEvento === 'despacho_producto' &&
        String(evento.idEntidad) === String(despacho.id_despacho)
      )) || null,
      confirmacionBlockchain: eventosFabric.find((evento) => (
        evento.tipoEvento === 'confirmacion_recepcion_cliente' &&
        String(evento.idEntidad) === String(despacho.id_despacho)
      )) || null
    })),
    inventariosMateriaPrima: (detalle?.inventariosMateriaPrima || []).map((inventario) => ({
      ...inventario,
      blockchain: blockchainPorEntidad[`inventario_materia_prima:${inventario.id}`] || null
    })),
    movimientosInventario: (detalle?.movimientosInventario || []).map((movimiento) => ({
      ...movimiento,
      blockchain: blockchainPorEntidad[`movimiento_inventario:${movimiento.id}`] || null
    })),
    eventos: eventos.map((e) => ({ id: e.id, event_type: e.tipo_evento, actor: e.actor, payload: e.payload, timestamp: e.creado_en })),
    validacionesBlockchain,
    decisionesBlockchain: deduplicarEventosFabric([
      eventosFabric.filter((evento) => [
        'despacho_producto',
        'confirmacion_recepcion_cliente',
        'alerta_vencimiento'
      ].includes(evento.tipoEvento)),
      historialCorrecciones
    ]),
    despachoBlockchain: eventosFabric.find((evento) => evento.tipoEvento === 'despacho_producto') || null,
    confirmacionCliente: eventosFabric.find((evento) => evento.tipoEvento === 'confirmacion_recepcion_cliente') || null,
    alertasVencimiento: eventosFabric.filter((evento) => evento.tipoEvento === 'alerta_vencimiento'),
    historialCorrecciones
  };

  return {
    ...resultado,
    codigosAcceso: generarCodigosAcceso(resultado)
  };
}

export async function registrarCorreccionTrazabilidad({ tipoEvento, idEntidad, motivo, actor }) {
  if (!String(motivo || '').trim()) throw new ErrorHttp(400, 'El motivo de la correccion es obligatorio');
  try {
    return await registrarCorreccionCritica({
      tipoEventoOriginal: tipoEvento,
      idEntidadOriginal: idEntidad,
      motivoCorreccion: motivo.trim(),
      actor
    });
  } catch (error) {
    if (error?.name === 'ErrorOperacionFabric') {
      throw new ErrorHttp(error.status || 503, error.message, { codigo: error.codigo });
    }
    throw error;
  }
}
