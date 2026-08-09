import { fabricTraceabilityService } from './fabric-traceability.service.js';

const ESTADOS_HTTP_FABRIC = {
  EVENTO_DUPLICADO: 409,
  EVENTO_NO_ENCONTRADO: 404,
  LOTE_NO_ENCONTRADO: 404,
  CREDENCIALES_CLIENTE_INVALIDAS: 403,
  RECEPCION_YA_CONFIRMADA: 409,
  DESPACHO_BLOQUEADO: 422,
  DESPACHO_DUPLICADO: 409,
  ALERTA_DUPLICADA: 409,
  LOTE_NO_VENCIDO: 400
};

export class ErrorOperacionFabric extends Error {
  constructor(codigo, message, status = 503, detalles = null) {
    super(message);
    this.name = 'ErrorOperacionFabric';
    this.codigo = codigo;
    this.status = status;
    this.detalles = detalles;
    this.motivos = detalles?.motivos || [];
  }
}

function extraerDetallesDespacho(message) {
  const marker = '[DESPACHO_BLOQUEADO]';
  const markerIndex = message.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = message.indexOf('{', markerIndex + marker.length);
  const end = message.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(message.slice(start, end + 1));
  } catch {
    return null;
  }
}

function recolectarMensajes(error, vistos = new Set()) {
  if (!error || vistos.has(error)) return [];
  vistos.add(error);
  const mensajes = [];
  if (error.message) mensajes.push(String(error.message));
  if (Array.isArray(error.details)) {
    for (const detalle of error.details) {
      if (detalle?.message) mensajes.push(String(detalle.message));
    }
  } else if (typeof error.details === 'string') {
    mensajes.push(error.details);
  }
  if (error.cause && typeof error.cause === 'object') {
    mensajes.push(...recolectarMensajes(error.cause, vistos));
  }
  return mensajes;
}

export function normalizarErrorFabric(error) {
  if (error instanceof ErrorOperacionFabric) return error;
  const mensajes = recolectarMensajes(error);
  const rawMessage = mensajes.find((message) => /\[[A-Z_]+\]/.test(message)) ||
    mensajes[0] || String(error || 'Operacion Fabric fallida');
  const codeMatch = rawMessage.match(/\[([A-Z_]+)\]/);
  const codigo = codeMatch?.[1] || 'FABRIC_NO_DISPONIBLE';
  const status = ESTADOS_HTTP_FABRIC[codigo] || 503;
  const message = codigo === 'FABRIC_NO_DISPONIBLE'
    ? 'Hyperledger Fabric no esta disponible. El despacho no fue registrado.'
    : rawMessage.replace(/^.*?\[([A-Z_]+)\]\s*/, '').trim();
  const mensajeDespacho = mensajes.find((item) => item.includes('[DESPACHO_BLOQUEADO]')) || rawMessage;
  return new ErrorOperacionFabric(codigo, message, status, extraerDetallesDespacho(mensajeDespacho));
}

function respuestaPendiente(error) {
  console.warn(`[Fabric] Evidencia pendiente: ${error.message}`);
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
    const normalizado = normalizarErrorFabric(error);
    if (normalizado.codigo === 'EVENTO_DUPLICADO') {
      return { estado: 'DUPLICADO', valido: false, mensaje: normalizado.message };
    }
    return respuestaPendiente(error);
  }
}

export async function validarEventoBlockchain(tipoEvento, idEntidad, payloadActual) {
  try {
    return await fabricTraceabilityService.validarEvento(tipoEvento, idEntidad, payloadActual);
  } catch (error) {
    return { ...respuestaPendiente(error), payloadActual };
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

async function ejecutarEstricto(callback) {
  try {
    return await callback();
  } catch (error) {
    throw normalizarErrorFabric(error);
  }
}

function resultadoTransaccion(resultado) {
  return {
    ...resultado.evento,
    transactionId: resultado.transactionId,
    blockNumber: resultado.blockNumber
  };
}

export function registrarCorreccionBlockchain(datos) {
  return ejecutarEstricto(async () => resultadoTransaccion(await fabricTraceabilityService.registrarCorreccion(datos)));
}

export function consultarHistorialBlockchain(tipoEvento, idEntidad) {
  return ejecutarEstricto(() => fabricTraceabilityService.consultarHistorial(tipoEvento, idEntidad));
}

export function validarDespachoBlockchain(datos) {
  return ejecutarEstricto(() => fabricTraceabilityService.validarDespacho(datos));
}

export function registrarDespachoBlockchain(datos) {
  return ejecutarEstricto(async () => resultadoTransaccion(await fabricTraceabilityService.registrarDespacho(datos)));
}

export function confirmarRecepcionClienteBlockchain(datos) {
  return ejecutarEstricto(async () => resultadoTransaccion(await fabricTraceabilityService.confirmarRecepcionCliente(datos)));
}

export function registrarAlertaVencimientoBlockchain(datos) {
  return ejecutarEstricto(async () => resultadoTransaccion(await fabricTraceabilityService.registrarAlertaVencimiento(datos)));
}
