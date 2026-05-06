import { registrarEventoRecepcion } from '../blockchain/blockchain.service.js';
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
      resultado_inspeccion_vehiculo: {
        vehiculo: data.inspeccion_vehiculo?.vehiculo,
        conductor: data.inspeccion_vehiculo?.conductor,
        limpieza_vehiculo: data.inspeccion_vehiculo?.limpieza_vehiculo,
        transporte_vehiculo: data.inspeccion_vehiculo?.transporte_vehiculo
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
      resultadoInspeccionVehiculo: {
        vehiculo: contexto.vehiculo,
        conductor: contexto.conductor,
        placa: contexto.placa,
        limpieza: contexto.limpieza_vehiculo,
        transporte: contexto.transporte_vehiculo
      },
      estadoRecepcion: contexto.estado_recepcion
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
