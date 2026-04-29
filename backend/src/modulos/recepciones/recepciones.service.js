import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  registrarEventoInspeccion,
  registrarEventoRecepcion
} from '../blockchain/blockchain.service.js';
import {
  buscarContextoRecepcionBlockchain,
  buscarRecepcionPorId,
  crearInspeccion,
  crearRecepcion,
  listarMateriasPrimas,
  listarRecepciones,
  registrarEventoTrazabilidad
} from './recepciones.repository.js';

export async function crearRecepcionService(data, actor) {
  const recepcion = await crearRecepcion(data);
  const contexto = await buscarContextoRecepcionBlockchain(recepcion.id);

  await registrarEventoTrazabilidad({
    recepcion_id: recepcion.id,
    lote: recepcion.lote_proveedor,
    tipo_evento: 'RECEPTION_CREATED',
    actor,
    payload: {
      proveedor_id: recepcion.proveedor_id,
      materia_prima_id: recepcion.materia_prima_id,
      estado_recepcion: recepcion.estado_recepcion
    }
  });

  if (contexto) {
    await registrarEventoRecepcion({
      lote: contexto.lote_proveedor,
      usuario: actor,
      proveedor: contexto.proveedor_nombre,
      materiaPrima: contexto.materia_prima_nombre,
      cantidad: contexto.cantidad,
      unidad: contexto.unidad_presentacion,
      loteProveedor: contexto.lote_proveedor,
      fechaRecepcion: contexto.fecha_recepcion,
      fechaVencimiento: contexto.fecha_vencimiento,
      temperaturaRecepcion: contexto.temperatura_recepcion,
      pesoRecibido: contexto.peso_recibido,
      estadoRecepcion: contexto.estado_recepcion
    });
  }

  return recepcion;
}

export async function listarRecepcionesService() {
  return listarRecepciones();
}

export async function crearInspeccionService(recepcionId, data, actor) {
  const recepcion = await buscarRecepcionPorId(recepcionId);
  if (!recepcion) {
    throw new ErrorHttp(404, 'Recepcion no encontrada');
  }

  const inspeccion = await crearInspeccion(recepcionId, data);

  await registrarEventoTrazabilidad({
    recepcion_id: recepcion.id,
    lote: recepcion.lote_proveedor,
    tipo_evento: 'RECEPTION_INSPECTED',
    actor,
    payload: {
      inspeccion_id: inspeccion.id,
      decision_final: inspeccion.decision_final
    }
  });

  await registrarEventoInspeccion({
    lote: recepcion.lote_proveedor,
    usuario: actor,
    resultadoInspeccion: inspeccion.decision_final,
    olor: data.olor,
    color: data.color,
    textura: data.textura,
    estadoEmpaque: data.estado_empaque,
    certificadoCalidad: data.certificado_calidad,
    inspeccionVehiculo: data.inspeccion_vehiculo,
    observaciones: data.observaciones
  });

  return inspeccion;
}

export async function listarMateriasPrimasService() {
  return listarMateriasPrimas();
}
