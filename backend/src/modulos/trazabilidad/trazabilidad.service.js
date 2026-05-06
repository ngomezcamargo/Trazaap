import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { listarEventosBlockchainPorLote } from '../blockchain/blockchain.repository.js';
import {
  buscarOrdenPorLoteFinalOLoteRecepcion,
  buscarTrazabilidadRecepcionPorLote,
  listarEventosPorLote,
  obtenerDetalleProduccion
} from './trazabilidad.repository.js';

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
