import crypto from 'crypto';
import {
  consultarEventoBlockchain,
  consultarEventosPorLote,
  registrarEventoBlockchain,
  validarEventoBlockchain
} from './fabric.client.js';
import { construirPayloadInspeccion } from './payloads/inspeccion.payload.js';
import { construirPayloadInventarioMateriaPrima } from './payloads/inventarioMateriaPrima.payload.js';
import { construirPayloadInventarioProductoTerminado } from './payloads/inventarioProductoTerminado.payload.js';
import { construirPayloadLiberacion } from './payloads/liberacion.payload.js';
import { construirPayloadManufactura } from './payloads/manufactura.payload.js';
import { construirPayloadMovimientoInventario } from './payloads/movimientoInventario.payload.js';
import { construirPayloadOrdenProduccion } from './payloads/ordenProduccion.payload.js';
import { construirPayloadProductoFabricado } from './payloads/productoFabricado.payload.js';
import { construirPayloadRecepcion } from './payloads/recepcion.payload.js';
import { fechaISO, fechaSimple, numero, ordenarValor, serializarEstable } from './payloads/helpers.js';

const constructoresPayload = {
  recepcion_materia_prima: construirPayloadRecepcion,
  inspeccion_recepcion: construirPayloadInspeccion,
  orden_produccion: construirPayloadOrdenProduccion,
  producto_fabricado_configurado: construirPayloadProductoFabricado,
  registro_manufactura: construirPayloadManufactura,
  liberacion_producto: construirPayloadLiberacion,
  inventario_producto_terminado: construirPayloadInventarioProductoTerminado,
  inventario_materia_prima: construirPayloadInventarioMateriaPrima,
  movimiento_inventario: construirPayloadMovimientoInventario
};

export { ordenarValor, serializarEstable };

export function generarHashSHA256(value) {
  return crypto.createHash('sha256').update(serializarEstable(value)).digest('hex');
}

export function normalizarRecepcion(row) {
  return ordenarValor({
    id: row.id || row.recepcion_id,
    fechaRecepcion: fechaISO(row.fecha_recepcion),
    proveedorId: row.proveedor_id,
    proveedor: row.proveedor_nombre,
    proveedorNit: row.proveedor_nit || null,
    materiaPrimaId: row.materia_prima_id,
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
    id: row.inspeccion_id,
    recepcionId: row.id || row.recepcion_id,
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
    mensaje: resultado.mensaje
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

export async function registrarEventoCritico(tipoEvento, idEntidad, actorFallback = 'sistema') {
  const evento = await construirEventoBlockchain(tipoEvento, idEntidad);
  if (!evento) return null;

  const payload = ordenarValor(evento.payload);
  const hashLocal = generarHashSHA256(payload);
  const resultado = await registrarEventoBlockchain({
    ...evento,
    actor: evento.actor || actorFallback,
    payload
  });

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
