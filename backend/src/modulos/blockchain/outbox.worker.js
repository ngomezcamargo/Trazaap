import {
  marcarEventoOutboxConError,
  marcarEventoOutboxFallido,
  marcarEventoOutboxEnviado,
  tomarSiguienteEventoOutbox
} from './outbox.repository.js';
import {
  confirmarEntregaPorId,
  inicializarInventarioTerminadoCritico,
  registrarDespachoPorId,
  registrarEventoCritico,
  registrarVersionEventoCritico
} from './blockchain.service.js';
import {
  bloquearConfirmacionPorFabric,
  bloquearDespachoPorFabric,
  confirmarDespachoProcesado,
  confirmarEntregaProcesada
} from '../despachos/despachos.service.js';

const INTERVALO_MS = 5000;
const TAMANO_LOTE = 10;
const MAX_INTENTOS = 10;
let temporizador = null;
let ejecutando = false;

async function procesarItem(item) {
  if (item.operacion === 'inicializar_inventario_terminado') {
    return inicializarInventarioTerminadoCritico(item.id_entidad);
  }
  if (item.operacion === 'registrar_despacho') {
    const resultado = await registrarDespachoPorId(item.id_entidad);
    await confirmarDespachoProcesado(item.id_entidad, resultado);
    return resultado;
  }
  if (item.operacion === 'confirmar_entrega') {
    const resultado = await confirmarEntregaPorId(item.id_entidad);
    await confirmarEntregaProcesada(item.id_entidad, resultado);
    return resultado;
  }

  const opciones = { encolarSiPendiente: false };
  const resultado = item.operacion === 'versionar'
    ? await registrarVersionEventoCritico(
        item.tipo_evento,
        item.id_entidad,
        item.actor,
        'Actualizacion funcional pendiente de sincronizacion',
        opciones
      )
    : await registrarEventoCritico(item.tipo_evento, item.id_entidad, item.actor, opciones);

  if (!resultado || resultado.estado === 'PENDIENTE') {
    throw new Error(resultado?.mensaje || 'Fabric no confirmo el evento');
  }
  return resultado;
}

function esFalloDefinitivo(error) {
  return [
    'DESPACHO_BLOQUEADO',
    'DESPACHO_DUPLICADO',
    'LOTE_SIN_EXISTENCIAS',
    'STOCK_INSUFICIENTE',
    'INVENTARIO_DUPLICADO',
    'CREDENCIALES_CLIENTE_INVALIDAS',
    'RECEPCION_YA_CONFIRMADA'
  ].includes(error?.codigo);
}

async function resolverFalloOperativo(item, error) {
  if (item.operacion === 'registrar_despacho') {
    await bloquearDespachoPorFabric(item.id_entidad, error);
  } else if (item.operacion === 'confirmar_entrega') {
    await bloquearConfirmacionPorFabric(item.id_entidad, error);
  }
}

export async function procesarOutboxAhora() {
  if (ejecutando) return 0;
  ejecutando = true;
  let procesados = 0;
  try {
    for (let i = 0; i < TAMANO_LOTE; i += 1) {
      const item = await tomarSiguienteEventoOutbox(MAX_INTENTOS);
      if (!item) break;
      try {
        const resultado = await procesarItem(item);
        await marcarEventoOutboxEnviado(
          item.id_outbox,
          item.version_solicitud,
          resultado.transactionId || resultado.txId || null
        );
      } catch (error) {
        const actualizado = esFalloDefinitivo(error)
          ? await marcarEventoOutboxFallido(item, error)
          : await marcarEventoOutboxConError(item, error, MAX_INTENTOS);
        if (actualizado?.estado === 'fallido') {
          await resolverFalloOperativo(item, error);
        }
      }
      procesados += 1;
    }
  } finally {
    ejecutando = false;
  }
  return procesados;
}

export function iniciarProcesadorOutbox() {
  if (temporizador) return;
  procesarOutboxAhora().catch((error) => console.error('[Fabric outbox]', error.message));
  temporizador = setInterval(() => {
    procesarOutboxAhora().catch((error) => console.error('[Fabric outbox]', error.message));
  }, INTERVALO_MS);
  temporizador.unref?.();
}

export function detenerProcesadorOutbox() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}
