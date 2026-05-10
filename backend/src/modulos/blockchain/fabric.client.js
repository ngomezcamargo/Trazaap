import { fabricTraceabilityService } from './fabric-traceability.service.js';

function respuestaPendiente(error) {
  return {
    valido: false,
    estado: 'PENDIENTE',
    mensaje: `Evidencia Fabric pendiente: ${error.message}`
  };
}

export async function registrarEventoBlockchain(evento) {
  try {
    const resultado = await fabricTraceabilityService.registrarEvento(evento);
    return {
      estado: 'REGISTRADO',
      valido: true,
      mensaje: 'Evidencia registrada en Hyperledger Fabric',
      transactionId: resultado.transactionId,
      blockNumber: resultado.blockNumber,
      evento: resultado.evento
    };
  } catch (error) {
    return respuestaPendiente(error);
  }
}

export async function validarEventoBlockchain(tipoEvento, idEntidad, payloadActual) {
  try {
    return await fabricTraceabilityService.validarEvento(tipoEvento, idEntidad, payloadActual);
  } catch (error) {
    return {
      ...respuestaPendiente(error),
      payloadActual
    };
  }
}

export async function consultarEventoBlockchain(tipoEvento, idEntidad) {
  try {
    return await fabricTraceabilityService.consultarEvento(tipoEvento, idEntidad);
  } catch (error) {
    return respuestaPendiente(error);
  }
}

export async function consultarEventosPorLote(lote) {
  try {
    return await fabricTraceabilityService.consultarEventosPorLote(lote);
  } catch {
    return [];
  }
}
