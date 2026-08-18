import crypto from 'crypto';
import {
  confirmarRecepcionClienteBlockchain,
  consultarEventoBlockchain,
  consultarEventosPorLote,
  consultarHistorialBlockchain,
  consultarSaldoInventarioBlockchain,
  inicializarInventarioTerminadoBlockchain,
  registrarAlertaVencimientoBlockchain,
  registrarCorreccionBlockchain,
  registrarDespachoBlockchain,
  registrarEventoBlockchain,
  validarDespachoBlockchain,
  validarEventoBlockchain
} from './fabric.client.js';
import { construirPayloadInspeccion } from './payloads/inspeccion.payload.js';
import { construirPayloadInventarioMateriaPrima } from './payloads/inventarioMateriaPrima.payload.js';
import { construirPayloadInventarioProductoTerminado } from './payloads/inventarioProductoTerminado.payload.js';
import { construirInicializacionInventarioTerminado } from './payloads/inventarioProductoTerminado.payload.js';
import { construirPayloadDespacho } from './payloads/despacho.payload.js';
import { construirPayloadConfirmacionEntrega } from './payloads/confirmacionEntrega.payload.js';
import { construirPayloadIngresoAlmacenamiento } from './payloads/ingresoAlmacenamiento.payload.js';
import { construirPayloadControlAlmacenamiento } from './payloads/controlAlmacenamiento.payload.js';
import { construirPayloadSalidaAlmacenamiento } from './payloads/salidaAlmacenamiento.payload.js';
import { construirPayloadLiberacion } from './payloads/liberacion.payload.js';
import { construirPayloadManufactura } from './payloads/manufactura.payload.js';
import { construirPayloadMovimientoInventario } from './payloads/movimientoInventario.payload.js';
import { construirPayloadOrdenProduccion } from './payloads/ordenProduccion.payload.js';
import { construirPayloadProductoFabricado } from './payloads/productoFabricado.payload.js';
import { construirPayloadRecepcion } from './payloads/recepcion.payload.js';
import { construirPayloadEnvasado } from './payloads/envasado.payload.js';
import { construirPayloadSaneamiento } from './payloads/saneamiento.payload.js';
import { construirPayloadDevolucion } from './payloads/devolucion.payload.js';
import { construirPayloadCalidad } from './payloads/calidad.payload.js';
import { fechaISO, fechaSimple, numero, ordenarValor, serializarEstable } from './payloads/helpers.js';
import { encolarEventoBlockchain } from './outbox.repository.js';

const constructoresPayload = {
  recepcion_materia_prima: construirPayloadRecepcion,
  inspeccion_recepcion: construirPayloadInspeccion,
  orden_produccion: construirPayloadOrdenProduccion,
  producto_fabricado_configurado: construirPayloadProductoFabricado,
  registro_manufactura: construirPayloadManufactura,
  liberacion_producto: construirPayloadLiberacion,
  inventario_producto_terminado: construirPayloadInventarioProductoTerminado,
  inventario_materia_prima: construirPayloadInventarioMateriaPrima,
  movimiento_inventario: construirPayloadMovimientoInventario,
  ingreso_almacenamiento: construirPayloadIngresoAlmacenamiento,
  control_almacenamiento: construirPayloadControlAlmacenamiento,
  salida_almacenamiento: construirPayloadSalidaAlmacenamiento,
  envasado_embalado: construirPayloadEnvasado,
  actividad_saneamiento: construirPayloadSaneamiento,
  devolucion_no_conformidad: construirPayloadDevolucion,
  control_calidad_lote: construirPayloadCalidad
};

export { ordenarValor, serializarEstable };

export function generarHashSHA256(value) {
  return crypto.createHash('sha256').update(serializarEstable(value)).digest('hex');
}

export function normalizarRecepcion(row) {
  return ordenarValor({
    fechaRecepcion: fechaISO(row.fecha_recepcion),
    proveedor: row.proveedor_nombre,
    proveedorNit: row.proveedor_nit || null,
    materiaPrima: row.materia_prima_nombre || row.materia_prima,
    cantidad: numero(row.cantidad) || null,
    unidadMedida: row.unidad_medida || null,
    presentacion: row.presentacion || row.unidad_presentacion || null,
    lote: row.numero_lote || row.lote_proveedor,
    fechaVencimiento: fechaSimple(row.fecha_vencimiento) || null,
    temperaturaRecepcion: numero(row.temperatura_recepcion) || null,
    pesoRecibido: numero(row.peso_recibido) || null,
    recibidoPor: row.recibido_por || null,
    estadoRecepcion: row.estado_recepcion,
    observaciones: row.observaciones || row.recepcion_observaciones || null
  });
}

export function normalizarInspeccionRecepcion(row) {
  if (!row?.inspeccion_id && !row?.decision_final) return null;

  return ordenarValor({
    lote: row.numero_lote || row.lote_proveedor,
    olor: Boolean(row.olor),
    color: Boolean(row.color),
    textura: Boolean(row.textura),
    estadoEmpaque: Boolean(row.estado_empaque),
    certificadoCalidad: Boolean(row.certificado_calidad),
    inspeccionTransporte: Boolean(row.inspeccion_transporte),
    condicionesVehiculo: row.condiciones_vehiculo == null ? null : Boolean(row.condiciones_vehiculo),
    higieneConductor: row.higiene_conductor == null ? null : Boolean(row.higiene_conductor),
    observacionesProducto: row.observaciones_producto || null,
    observacionesTransporte: row.observaciones_transporte || null,
    observacionesGenerales: row.inspeccion_observaciones || row.observaciones || null,
    decisionFinal: row.decision_final,
    inspeccionadoPor: row.inspeccionado_por || null,
    inspeccionadoEn: fechaISO(row.inspeccionado_en) || null
  });
}

function estadoDesdeResultado(resultado, hashActual) {
  return {
    estadoBlockchain: resultado.estado,
    valido: Boolean(resultado.valido),
    hashActual: resultado.hashActual || hashActual || null,
    hashBlockchain: resultado.hashBlockchain || null,
    hashOriginal: resultado.hashOriginal || null,
    mensaje: resultado.mensaje,
    motivoCorreccion: resultado.motivoCorreccion || null,
    txId: resultado.txId || null,
    timestampBlockchain: resultado.timestampBlockchain || null
  };
}

export async function construirEventoBlockchain(tipoEvento, idEntidad) {
  const constructor = constructoresPayload[tipoEvento];
  if (!constructor) throw new Error(`Tipo de evento blockchain no soportado: ${tipoEvento}`);

  const evento = await constructor(idEntidad);
  if (!evento) return null;

  return {
    ...evento,
    idEntidad: String(evento.idEntidad),
    payload: ordenarValor(evento.payload)
  };
}

export async function registrarEventoCritico(
  tipoEvento,
  idEntidad,
  actorFallback = 'sistema',
  { encolarSiPendiente = true } = {}
) {
  const evento = await construirEventoBlockchain(tipoEvento, idEntidad);
  if (!evento) return null;

  const payload = ordenarValor(evento.payload);
  const hashLocal = generarHashSHA256(payload);
  const validacionExistente = await validarEventoBlockchain(tipoEvento, evento.idEntidad, payload);

  if (['VERIFICADO', 'VERIFICADO_CORREGIDO'].includes(validacionExistente.estado)) {
    return {
      tipoEvento,
      idEntidad: evento.idEntidad,
      lote: evento.lote,
      hashLocal,
      estado: 'YA_REGISTRADO',
      valido: true,
      mensaje: validacionExistente.mensaje || 'La evidencia inmutable ya existe y coincide con el registro operativo',
      estadoValidacion: validacionExistente.estado,
      transactionId: validacionExistente.txId || null
    };
  }

  if (validacionExistente.estado === 'ALTERADO') {
    return {
      tipoEvento,
      idEntidad: evento.idEntidad,
      lote: evento.lote,
      hashLocal,
      estado: 'ALTERADO',
      valido: false,
      mensaje: 'El registro operativo fue modificado; la evidencia original no se sobrescribio',
      hashBlockchain: validacionExistente.hashBlockchain,
      hashActual: validacionExistente.hashActual
    };
  }

  if (validacionExistente.estado === 'PENDIENTE') {
    if (encolarSiPendiente) {
      await encolarEventoBlockchain({ tipoEvento, idEntidad: evento.idEntidad, actor: actorFallback });
    }
    return {
      tipoEvento,
      idEntidad: evento.idEntidad,
      lote: evento.lote,
      hashLocal,
      ...validacionExistente
    };
  }

  const resultado = await registrarEventoBlockchain({
    ...evento,
    actor: evento.actor || actorFallback,
    payload
  });

  if (resultado.estado === 'PENDIENTE' && encolarSiPendiente) {
    await encolarEventoBlockchain({ tipoEvento, idEntidad: evento.idEntidad, actor: actorFallback });
  }

  return {
    tipoEvento,
    idEntidad: evento.idEntidad,
    lote: evento.lote,
    hashLocal,
    ...resultado
  };
}

export async function validarEventoCritico(tipoEvento, idEntidad) {
  const evento = await construirEventoBlockchain(tipoEvento, idEntidad);
  if (!evento) return null;

  const payload = ordenarValor(evento.payload);
  const hashActualLocal = generarHashSHA256(payload);
  const resultado = await validarEventoBlockchain(tipoEvento, evento.idEntidad, payload);

  return {
    tipoEvento,
    idEntidad: evento.idEntidad,
    lote: evento.lote,
    payload,
    ...estadoDesdeResultado(resultado, hashActualLocal)
  };
}

export async function consultarEventoCritico(tipoEvento, idEntidad) {
  return consultarEventoBlockchain(tipoEvento, String(idEntidad));
}

export { consultarEventosPorLote };

export async function registrarCorreccionCritica({
  tipoEventoOriginal,
  idEntidadOriginal,
  motivoCorreccion,
  actor
}) {
  const evento = await construirEventoBlockchain(tipoEventoOriginal, idEntidadOriginal);
  if (!evento) throw new Error(`No existe el registro operativo ${tipoEventoOriginal}:${idEntidadOriginal}`);
  return registrarCorreccionBlockchain({
    tipoEventoOriginal,
    idEntidadOriginal: String(idEntidadOriginal),
    motivoCorreccion,
    actor,
    payloadCorregido: ordenarValor(evento.payload)
  });
}

export async function registrarVersionEventoCritico(
  tipoEvento,
  idEntidad,
  actor = 'sistema',
  motivoCorreccion = 'Actualizacion funcional del registro operativo',
  opciones = {}
) {
  const resultado = await registrarEventoCritico(tipoEvento, idEntidad, actor, opciones);
  if (resultado?.estado !== 'ALTERADO') return resultado;
  let correccion;
  try {
    correccion = await registrarCorreccionCritica({
      tipoEventoOriginal: tipoEvento,
      idEntidadOriginal: idEntidad,
      motivoCorreccion,
      actor: actor || 'sistema'
    });
  } catch (error) {
    if (opciones.encolarSiPendiente !== false) {
      await encolarEventoBlockchain({
        tipoEvento, idEntidad, actor: actor || 'sistema', operacion: 'versionar'
      });
      return { ...resultado, estado: 'PENDIENTE', mensaje: error.message };
    }
    throw error;
  }

  return {
    tipoEvento,
    idEntidad: String(idEntidad),
    lote: resultado.lote,
    estado: 'CORRECCION_REGISTRADA',
    valido: true,
    mensaje: 'La nueva version funcional se registro sin sobrescribir la evidencia original',
    transactionId: correccion.txId || null,
    correccion
  };
}

export function consultarHistorialCritico(tipoEvento, idEntidad) {
  return consultarHistorialBlockchain(tipoEvento, String(idEntidad));
}

export function validarDespachoCritico(datos) {
  return validarDespachoBlockchain(ordenarValor(datos));
}

export function registrarDespachoCritico(datos) {
  return registrarDespachoBlockchain(ordenarValor(datos));
}

export async function inicializarInventarioTerminadoCritico(idInventario) {
  const datos = await construirInicializacionInventarioTerminado(idInventario);
  if (!datos) throw new Error(`Inventario terminado ${idInventario} no encontrado`);
  return inicializarInventarioTerminadoBlockchain(datos);
}

export function consultarSaldoInventarioTerminado(idInventario) {
  return consultarSaldoInventarioBlockchain(String(idInventario));
}

export async function registrarDespachoPorId(idDespacho) {
  const datos = await construirPayloadDespacho(idDespacho);
  if (!datos) throw new Error(`Despacho ${idDespacho} no encontrado`);
  return registrarDespachoBlockchain(datos);
}

export async function confirmarEntregaPorId(idConfirmacion) {
  const datos = await construirPayloadConfirmacionEntrega(idConfirmacion);
  if (!datos) throw new Error(`Confirmacion ${idConfirmacion} no encontrada`);
  return confirmarRecepcionClienteBlockchain(datos);
}

export function confirmarRecepcionCliente(datos) {
  return confirmarRecepcionClienteBlockchain(datos);
}

export function registrarAlertaVencimiento(datos) {
  return registrarAlertaVencimientoBlockchain(ordenarValor(datos));
}

export async function registrarEventoRecepcion(contexto, actor) {
  const id = contexto?.id || contexto?.recepcion_id;
  return registrarEventoCritico('recepcion_materia_prima', id, actor);
}

export async function registrarEventoInspeccion(contexto, actor) {
  const id = contexto?.inspeccion_id || contexto?.id;
  if (!id) return null;
  return registrarEventoCritico('inspeccion_recepcion', id, actor);
}

export async function validarEventoRecepcion(contexto) {
  const id = contexto?.id || contexto?.recepcion_id;
  return validarEventoCritico('recepcion_materia_prima', id);
}

export async function validarEventoInspeccion(contexto) {
  const id = contexto?.inspeccion_id || contexto?.id;
  if (!id) return null;
  return validarEventoCritico('inspeccion_recepcion', id);
}

export async function registrarEventoProduccion(data) {
  if (data?.tipoEvento && data?.idEntidad) {
    return registrarEventoCritico(data.tipoEvento, data.idEntidad, data.usuario || data.responsable);
  }
  return null;
}

export async function registrarEventoLiberacion(data) {
  const id = data?.idEntidad || data?.liberacionId;
  if (!id) return null;
  return registrarEventoCritico('liberacion_producto', id, data.usuario || data.responsable);
}
