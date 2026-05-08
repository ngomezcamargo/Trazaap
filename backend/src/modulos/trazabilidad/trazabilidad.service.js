import { randomUUID } from 'crypto';
import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { listarEventosBlockchainPorLote } from '../blockchain/blockchain.repository.js';
import { fabricTraceabilityService } from '../blockchain/fabric-traceability.service.js';
import { calcularHashEvento, verificarCadenaHashes } from './trazabilidad.hash.js';
import {
  actualizarResultadoFabricEvento,
  buscarEventoAuditablePorId,
  buscarOrdenPorLoteFinalOLoteRecepcion,
  buscarTrazabilidadRecepcionPorLote,
  buscarUltimoEventoAuditablePorLote,
  crearEventoAuditable,
  listarEventosAuditablesPorLote,
  listarEventosPorLote,
  obtenerDetalleProduccion
} from './trazabilidad.repository.js';

export { calcularHashEvento } from './trazabilidad.hash.js';

function mapearEventoAuditable(row) {
  if (!row) return null;
  return {
    id: row.id,
    codigoLote: row.codigo_lote,
    tipoEvento: row.tipo_evento,
    descripcion: row.descripcion,
    responsable: row.responsable,
    fechaEvento: row.fecha_evento,
    datosEvento: row.datos_evento,
    hashEvento: row.hash_evento,
    hashAnterior: row.hash_anterior,
    fabricTxId: row.fabric_tx_id,
    fabricBlockNumber: row.fabric_block_number,
    fabricStatus: row.fabric_status,
    fabricError: row.fabric_error,
    createdAt: row.created_at
  };
}

function evidenciaFabricDesdeEvento(evento) {
  return {
    eventId: evento.id,
    codigoLote: evento.codigo_lote,
    tipoEvento: evento.tipo_evento,
    hashEvento: evento.hash_evento,
    hashAnterior: evento.hash_anterior,
    timestamp: new Date(evento.fecha_evento).toISOString(),
    responsable: evento.responsable
  };
}

export async function consultarTrazabilidadPorLote(lote) {
  const recepcion = await buscarTrazabilidadRecepcionPorLote(lote);
  const orden = await buscarOrdenPorLoteFinalOLoteRecepcion(lote);

  if (!recepcion && !orden) throw new ErrorHttp(404, 'No hay informacion de trazabilidad para ese lote');

  const detalle = orden ? await obtenerDetalleProduccion(orden.id) : null;

  const lotes = [
    lote,
    ...(detalle?.loteTerminado?.lote_producto ? [detalle.loteTerminado.lote_producto] : []),
    ...new Set((detalle?.materias || []).map((m) => m.lote_proveedor))
  ];

  const eventos = (await Promise.all(lotes.map((value) => listarEventosPorLote(value)))).flat();
  const eventosBlockchain = (await Promise.all(lotes.map((value) => listarEventosBlockchainPorLote(value)))).flat();

  return {
    lote,
    proveedor: recepcion ? { id: recepcion.proveedor_id, nombre: recepcion.proveedor_nombre, nit: recepcion.proveedor_nit } : null,
    recepcion: recepcion
      ? {
          id: recepcion.recepcion_id,
          fecha_recepcion: recepcion.fecha_recepcion,
          estado_recepcion: recepcion.estado_recepcion,
          cantidad: recepcion.cantidad,
          unidad_presentacion: recepcion.unidad_presentacion,
          temperatura_recepcion: recepcion.temperatura_recepcion,
          peso_recibido: recepcion.peso_recibido,
          observaciones: recepcion.recepcion_observaciones,
          materia_prima: recepcion.materia_prima
        }
      : null,
    inspeccion: recepcion?.inspeccion_id
      ? {
          id: recepcion.inspeccion_id,
          decision_final: recepcion.decision_final,
          olor: recepcion.olor,
          color: recepcion.color,
          textura: recepcion.textura,
          estado_empaque: recepcion.estado_empaque,
          certificado_calidad: recepcion.certificado_calidad,
          inspeccion_vehiculo: recepcion.inspeccion_vehiculo,
          observaciones: recepcion.inspeccion_observaciones,
          inspeccionado_en: recepcion.inspeccionado_en
        }
      : null,
    produccion: orden
      ? {
          orden: orden,
          productos: detalle.productos,
          ingredientes: detalle.materias,
          mojes: detalle.mojes.map((moje) => ({
            ...moje,
            ingredientes: detalle.mojesIngredientes.filter((item) => item.moje_id === moje.id)
          })),
          tiempos: detalle.tiempos,
          lote_terminado: detalle.loteTerminado
        }
      : null,
    liberacion: detalle?.liberacion || null,
    eventos: eventos.map((e) => ({ id: e.id, event_type: e.tipo_evento, actor: e.actor, payload: e.payload, timestamp: e.creado_en })),
    eventosBlockchain: eventosBlockchain.map((e) => ({
      id: e.id,
      tipoEvento: e.tipo_evento,
      hash: e.hash,
      fechaEvento: e.fecha_evento,
      usuario: e.usuario,
      payload: e.payload_json
    }))
  };
}

export async function crearEventoTrazabilidadAuditable(data) {
  const fechaEvento = new Date(data.fechaEvento || Date.now()).toISOString();
  const ultimoEvento = await buscarUltimoEventoAuditablePorLote(data.codigoLote);
  const hashAnterior = ultimoEvento?.hash_evento || null;
  const hashEvento = calcularHashEvento({
    codigoLote: data.codigoLote,
    tipoEvento: data.tipoEvento,
    descripcion: data.descripcion,
    responsable: data.responsable,
    fechaEvento,
    datosEvento: data.datosEvento || {},
    hashAnterior
  });

  const evento = await crearEventoAuditable({
    id: randomUUID(),
    codigo_lote: data.codigoLote,
    tipo_evento: data.tipoEvento,
    descripcion: data.descripcion,
    responsable: data.responsable,
    fecha_evento: fechaEvento,
    datos_evento: data.datosEvento || {},
    hash_evento: hashEvento,
    hash_anterior: hashAnterior,
    fabric_status: 'pendiente'
  });

  try {
    const resultadoFabric = await fabricTraceabilityService.registerEventOnFabric(evidenciaFabricDesdeEvento(evento));
    const actualizado = await actualizarResultadoFabricEvento(evento.id, {
      fabric_tx_id: resultadoFabric.transactionId,
      fabric_block_number: resultadoFabric.blockNumber,
      fabric_status: 'registrado',
      fabric_error: null
    });
    return mapearEventoAuditable(actualizado);
  } catch (error) {
    const actualizado = await actualizarResultadoFabricEvento(evento.id, {
      fabric_tx_id: null,
      fabric_block_number: null,
      fabric_status: 'error',
      fabric_error: error.message
    });
    return mapearEventoAuditable(actualizado);
  }
}

export async function listarEventosTrazabilidadAuditablePorLote(codigoLote) {
  const eventos = await listarEventosAuditablesPorLote(codigoLote);
  let eventosFabric = [];

  try {
    eventosFabric = await fabricTraceabilityService.getEventsByLotFromFabric(codigoLote);
  } catch {
    eventosFabric = [];
  }

  return {
    codigoLote,
    eventos: eventos.map(mapearEventoAuditable),
    eventosFabric
  };
}

export async function consultarEventoFabric(eventId) {
  const evento = await buscarEventoAuditablePorId(eventId);
  if (!evento) throw new ErrorHttp(404, 'Evento de trazabilidad no encontrado');
  return fabricTraceabilityService.getEventFromFabric(eventId);
}

export async function verificarEventoContraFabric(eventId) {
  const evento = await buscarEventoAuditablePorId(eventId);
  if (!evento) throw new ErrorHttp(404, 'Evento de trazabilidad no encontrado');

  const evidenciaFabric = await fabricTraceabilityService.getEventFromFabric(eventId);
  return {
    eventId,
    valido:
      evidenciaFabric.hashEvento === evento.hash_evento &&
      evidenciaFabric.hashAnterior === evento.hash_anterior &&
      evidenciaFabric.codigoLote === evento.codigo_lote,
    baseDatos: mapearEventoAuditable(evento),
    fabric: evidenciaFabric
  };
}

export async function verificarIntegridadLote(codigoLote) {
  const eventos = await listarEventosAuditablesPorLote(codigoLote);
  const errores = verificarCadenaHashes(eventos);

  for (const evento of eventos) {
    try {
      const evidenciaFabric = await fabricTraceabilityService.getEventFromFabric(evento.id);
      if (evidenciaFabric.hashEvento !== evento.hash_evento) {
        errores.push({
          eventId: evento.id,
          tipo: 'HASH_FABRIC_NO_COINCIDE',
          esperado: evento.hash_evento,
          actual: evidenciaFabric.hashEvento
        });
      }
      if (evidenciaFabric.hashAnterior !== evento.hash_anterior) {
        errores.push({
          eventId: evento.id,
          tipo: 'HASH_ANTERIOR_FABRIC_NO_COINCIDE',
          esperado: evento.hash_anterior,
          actual: evidenciaFabric.hashAnterior
        });
      }
    } catch (error) {
      errores.push({
        eventId: evento.id,
        tipo: 'FABRIC_NO_DISPONIBLE',
        mensaje: error.message
      });
    }
  }

  return {
    codigoLote,
    integridadValida: errores.length === 0,
    eventosVerificados: eventos.length,
    errores
  };
}
