import {
  registrarEventoCritico,
  registrarEventoInspeccion,
  registrarEventoRecepcion,
  registrarVersionEventoCritico
} from '../blockchain/blockchain.service.js';
import {
  buscarInventarioMateriaPorMateriaPrimaId,
  buscarContextoRecepcionBlockchain,
  buscarMovimientoInventarioPorReferencia,
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

  let evidenciaRecepcion = null;
  let evidenciaInspeccion = null;

  if (contexto) {
    evidenciaRecepcion = await registrarEventoRecepcion(contexto, actor);
    evidenciaInspeccion = await registrarEventoInspeccion(contexto, actor);
  }

  const evidenciaInventario = [];
  if (recepcion.estado_recepcion === 'aceptado') {
    const inventario = await buscarInventarioMateriaPorMateriaPrimaId(recepcion.materia_prima_id);
    const movimiento = await buscarMovimientoInventarioPorReferencia('recepcion', recepcion.id);

    if (inventario?.id) {
      evidenciaInventario.push(await registrarVersionEventoCritico(
        'inventario_materia_prima',
        inventario.id,
        actor,
        `Entrada de inventario por recepcion ${recepcion.numero_lote}`
      ));
    }
    if (movimiento?.id) {
      evidenciaInventario.push(await registrarEventoCritico('movimiento_inventario', movimiento.id, actor));
    }
  }

  return {
    ...recepcion,
    inspeccion,
    blockchain: {
      recepcion: evidenciaRecepcion,
      inspeccion: evidenciaInspeccion,
      inventario: evidenciaInventario.filter(Boolean)
    }
  };
}

export async function listarRecepcionesService() {
  return listarRecepciones();
}

export async function obtenerDetalleRecepcionService(id) {
  return obtenerDetalleRecepcion(id);
}
