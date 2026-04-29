import { registrarEventoRecepcion } from '../blockchain/blockchain.service.js';
import {
  buscarContextoRecepcionBlockchain,
  crearRecepcion,
  listarRecepciones,
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
      proveedor_id: recepcion.proveedor_id,
      materia_prima_id: recepcion.materia_prima_id,
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
