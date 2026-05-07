import { registrarEventoInspeccion, registrarEventoRecepcion } from '../blockchain/blockchain.service.js';
import {
  buscarContextoRecepcionBlockchain,
  crearRecepcion,
  listarRecepciones,
  obtenerDetalleRecepcion,
  registrarEventoTrazabilidad
} from './recepciones.repository.js';

export async function crearRecepcionService(data, actor) {
  const { recepcion, inspeccion } = await crearRecepcion(data);
  const contexto = await buscarContextoRecepcionBlockchain(recepcion.id);

  await registrarEventoTrazabilidad({
    recepcion_id: recepcion.id,
    lote: recepcion.numero_lote,
    tipo_evento: 'RECEPTION_CREATED',
    actor,
    payload: {
      fecha_recepcion: recepcion.fecha_recepcion,
      proveedor_id: recepcion.proveedor_id,
      materia_prima_id: recepcion.materia_prima_id,
      cantidad: recepcion.cantidad,
      unidad_medida: recepcion.unidad_medida || data.unidad_medida,
      presentacion: recepcion.presentacion || recepcion.unidad_presentacion,
      numero_lote: recepcion.numero_lote || recepcion.lote_proveedor,
      temperatura: recepcion.temperatura_recepcion,
      fecha_vencimiento: recepcion.fecha_vencimiento,
      recibido_por: recepcion.recibido_por,
      resultado_inspeccion_transporte: {
        condiciones_vehiculo: data.inspeccion_transporte?.condiciones_vehiculo,
        higiene_conductor: data.inspeccion_transporte?.higiene_conductor
      },
      estado_recepcion: recepcion.estado_recepcion,
      decision_producto: inspeccion.decision_final
    }
  });

  if (contexto) {
    await registrarEventoRecepcion({
      lote: contexto.numero_lote,
      usuario: actor,
      proveedor: contexto.proveedor_nombre,
      materiaPrima: contexto.materia_prima_nombre,
      cantidad: contexto.cantidad,
      unidadMedida: contexto.unidad_medida || data.unidad_medida,
      presentacion: contexto.presentacion,
      numeroLote: contexto.numero_lote,
      fechaRecepcion: contexto.fecha_recepcion,
      fechaVencimiento: contexto.fecha_vencimiento,
      temperaturaRecepcion: contexto.temperatura_recepcion,
      recibidoPor: recepcion.recibido_por,
      resultadoInspeccionProducto: contexto.decision_final,
      resultadoInspeccionTransporte: {
        condicionesVehiculo: contexto.condiciones_vehiculo,
        higieneConductor: contexto.higiene_conductor
      },
      estadoRecepcion: contexto.estado_recepcion
    });

    await registrarEventoInspeccion({
      lote: contexto.numero_lote,
      usuario: actor,
      proveedor: contexto.proveedor_nombre,
      materiaPrima: contexto.materia_prima_nombre,
      numeroLote: contexto.numero_lote,
      fechaRecepcion: contexto.fecha_recepcion,
      decisionAceptacion: contexto.decision_final,
      estadoRecepcion: contexto.estado_recepcion,
      inspeccionProducto: {
        aspecto: contexto.aspecto,
        color: contexto.color,
        olor: contexto.olor,
        textura: contexto.textura,
        temperaturaProducto: contexto.temperatura_producto,
        decisionFinal: contexto.decision_final
      },
      inspeccionTransporte: {
        condicionesVehiculo: contexto.condiciones_vehiculo,
        higieneConductor: contexto.higiene_conductor
      }
    });
  }

  return { ...recepcion, inspeccion };
}

export async function listarRecepcionesService() {
  return listarRecepciones();
}

export async function obtenerDetalleRecepcionService(id) {
  return obtenerDetalleRecepcion(id);
}
