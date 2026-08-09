import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  registrarAlertaVencimiento,
  registrarDespachoCritico,
  registrarEventoCritico,
  validarDespachoCritico
} from '../blockchain/blockchain.service.js';
import { generarCodigoCliente } from '../publico/codigos-acceso.util.js';
import { construirControlesCriticos } from './controles-criticos.service.js';
import {
  buscarLiberacionPorManufactura,
  buscarManufacturaPorId,
  buscarUsuarioOperarioPorId,
  crearInventarioProductoTerminadoDesdeLiberacion,
  crearLiberacionProducto,
  ejecutarTransaccionLiberacion,
  listarLotesVencidosSinDespacho,
  listarPendientesLiberacion,
  listarLiberaciones,
  registrarEventoTrazabilidad
} from './liberacion.repository.js';

const dependenciasPredeterminadas = {
  buscarLiberacionPorManufactura,
  buscarManufacturaPorId,
  buscarUsuarioOperarioPorId,
  crearInventarioProductoTerminadoDesdeLiberacion,
  crearLiberacionProducto,
  ejecutarTransaccionLiberacion,
  registrarEventoTrazabilidad,
  registrarDespachoCritico,
  registrarEventoCritico,
  validarDespachoCritico
};

function validarChecks(data) {
  if (!data.etiqueta_verificada || !data.verificacion_envase) {
    throw new ErrorHttp(400, 'Debe completar todas las validaciones de liberacion.');
  }
}

function propagarErrorFabric(error) {
  if (error?.name === 'ErrorOperacionFabric') {
    throw new ErrorHttp(error.status || 503, error.message, {
      codigo: error.codigo,
      motivos: error.motivos || []
    });
  }
  throw error;
}

export function construirDatosDespacho({
  manufactura,
  data,
  responsable,
  actor,
  idEntidad = null,
  fechaEvento = null,
  codigoCliente = null
}) {
  return {
    ...(idEntidad ? { idEntidad: String(idEntidad) } : {}),
    idManufactura: String(manufactura.id_manufactura),
    codigoOrden: manufactura.codigo_orden,
    lote: manufactura.lote_producido,
    producto: manufactura.producto,
    tamanoPresentacion: manufactura.tamano_presentacion,
    numeroFactura: data.numero_factura,
    tipoEmpaque: data.tipo_empaque,
    pesoNeto: Number(data.peso_neto),
    codigoCliente,
    fechaVencimiento: data.fecha_vencimiento,
    fechaEvento: fechaEvento || new Date().toISOString(),
    actor: actor || responsable.email,
    responsableLiberacion: responsable.email,
    estadoLiberacion: data.estado_liberacion,
    unidadesProducidas: Number(manufactura.unidades_producidas),
    unidadesDespachar: Number(data.unidades_empacadas),
    inventarioDisponible: Number(manufactura.unidades_producidas),
    validaciones: {
      etiquetaVerificada: Boolean(data.etiqueta_verificada),
      verificacionEnvase: Boolean(data.verificacion_envase),
      loteVisible: true,
      fechaVencimientoVisible: true,
      empaqueConforme: Boolean(data.verificacion_envase),
      productoBuenEstado: true
    },
    transporte: {
      conductor: data.conductor,
      placaVehiculo: data.placa_vehiculo,
      limpiezaVehiculo: data.limpieza_vehiculo,
      documentacionConductor: data.documentacion_dotacion
    },
    controlesCriticos: construirControlesCriticos(manufactura, data),
    observaciones: data.observaciones || ''
  };
}

export async function listarPendientesLiberacionService() {
  return listarPendientesLiberacion();
}

export async function crearLiberacionService(data, usuario, deps = dependenciasPredeterminadas) {
  const manufactura = await deps.buscarManufacturaPorId(data.id_manufactura);
  if (!manufactura) throw new ErrorHttp(404, 'Manufactura registrada no encontrada');

  const liberacionExistente = await deps.buscarLiberacionPorManufactura(data.id_manufactura);
  if (liberacionExistente) throw new ErrorHttp(400, 'Este lote ya tiene liberacion registrada');

  validarChecks(data);
  const responsableLiberacion = await deps.buscarUsuarioOperarioPorId(data.responsable_liberacion_usuario_id);
  if (!responsableLiberacion) {
    throw new ErrorHttp(400, 'Selecciona un operario activo como responsable de la liberacion');
  }

  const baseLiberacion = {
    ...data,
    id_orden_produccion: manufactura.id_orden_produccion,
    id_producto: manufactura.id_producto,
    lote_producido: manufactura.lote_producido,
    unidades_producidas: manufactura.unidades_producidas,
    responsable_liberacion: responsableLiberacion.id
  };

  let decisionPrevia = null;
  let datosDespachoPrevios = null;
  if (data.estado_liberacion === 'aprobado') {
    datosDespachoPrevios = construirDatosDespacho({
      manufactura,
      data,
      responsable: responsableLiberacion,
      actor: usuario.email
    });
    try {
      decisionPrevia = await deps.validarDespachoCritico(datosDespachoPrevios);
    } catch (error) {
      propagarErrorFabric(error);
    }

    if (!decisionPrevia?.permitido) {
      throw new ErrorHttp(422, 'El chaincode bloqueo el despacho.', {
        codigo: 'DESPACHO_BLOQUEADO',
        motivos: decisionPrevia?.motivos || [],
        decisionChaincode: decisionPrevia
      });
    }
  }

  let resultado;
  try {
    resultado = await deps.ejecutarTransaccionLiberacion(async (db) => {
      const repetida = await deps.buscarLiberacionPorManufactura(data.id_manufactura, db);
      if (repetida) throw new ErrorHttp(409, 'Este lote ya tiene liberacion registrada');

      const liberacion = await deps.crearLiberacionProducto(baseLiberacion, db);
      let despachoBlockchain = null;
      let inventarioTerminado = null;

      if (liberacion.estado_liberacion === 'aprobado') {
        const codigoCliente = generarCodigoCliente({
          lote: liberacion.lote_producido,
          numeroFactura: liberacion.numero_factura,
          idLiberacion: liberacion.id_liberacion
        });
        const datosDespacho = construirDatosDespacho({
          manufactura,
          data,
          responsable: responsableLiberacion,
          actor: usuario.email,
          idEntidad: liberacion.id_liberacion,
          fechaEvento: liberacion.fecha_liberacion,
          codigoCliente
        });
        despachoBlockchain = await deps.registrarDespachoCritico(datosDespacho);

        const unidadesRestantes = Math.max(
          Number(manufactura.unidades_producidas) - Number(liberacion.unidades_empacadas),
          0
        );
        inventarioTerminado = await deps.crearInventarioProductoTerminadoDesdeLiberacion({
          id_liberacion: liberacion.id_liberacion,
          producto: manufactura.producto,
          lote: manufactura.lote_producido,
          unidades_disponibles: unidadesRestantes,
          fecha_vencimiento: liberacion.fecha_vencimiento,
          estado: unidadesRestantes > 0 ? 'disponible' : 'despachado'
        }, db);
      }

      await deps.registrarEventoTrazabilidad({
        recepcion_id: null,
        lote: manufactura.lote_producido,
        tipo_evento: liberacion.estado_liberacion === 'aprobado'
          ? 'DESPACHO_PRODUCTO_REGISTRADO'
          : 'PRODUCT_RELEASE_RECORDED',
        actor: usuario.email,
        payload: {
          id_manufactura: manufactura.id_manufactura,
          id_liberacion: liberacion.id_liberacion,
          producto: manufactura.producto,
          lote: manufactura.lote_producido,
          unidades: liberacion.unidades_empacadas,
          numero_factura: liberacion.numero_factura,
          estado_liberacion: liberacion.estado_liberacion,
          decision_chaincode: despachoBlockchain?.decisionChaincode || decisionPrevia,
          transaccion_fabric: despachoBlockchain?.transactionId || despachoBlockchain?.txId || null
        }
      }, db);

      return { liberacion, inventarioTerminado, despachoBlockchain };
    });
  } catch (error) {
    propagarErrorFabric(error);
  }

  const evidenciaLiberacion = await deps.registrarEventoCritico(
    'liberacion_producto',
    resultado.liberacion.id_liberacion,
    usuario.email
  );
  const evidenciaInventarioTerminado = resultado.inventarioTerminado
    ? await deps.registrarEventoCritico(
        'inventario_producto_terminado',
        resultado.inventarioTerminado.id_inventario,
        usuario.email
      )
    : null;

  return {
    ...resultado.liberacion,
    producto: manufactura.producto,
    codigo_orden: manufactura.codigo_orden,
    responsable_liberacion_email: responsableLiberacion.email,
    inventario_producto_terminado: resultado.inventarioTerminado,
    decision_chaincode: resultado.despachoBlockchain?.decisionChaincode || decisionPrevia,
    blockchain: {
      despacho: resultado.despachoBlockchain,
      liberacion: evidenciaLiberacion,
      inventario_producto_terminado: evidenciaInventarioTerminado
    }
  };
}

export async function listarLiberacionesService() {
  return listarLiberaciones();
}

export async function procesarAlertasVencimientoService() {
  const lotes = await listarLotesVencidosSinDespacho();
  const resultados = [];
  for (const lote of lotes) {
    try {
      const evidencia = await registrarAlertaVencimiento({
        lote: lote.lote,
        producto: lote.producto,
        fechaVencimiento: lote.fecha_vencimiento,
        unidadesDisponibles: lote.unidades_disponibles,
        fechaDeteccion: new Date().toISOString(),
        actor: 'tarea_programada'
      });
      resultados.push({ ...lote, blockchain: evidencia });
    } catch (error) {
      if (error.codigo === 'ALERTA_DUPLICADA') {
        resultados.push({ ...lote, blockchain: { estado: 'VENCIDO_SIN_DESPACHO', duplicada: true } });
      } else if (error.codigo !== 'DESPACHO_DUPLICADO') {
        console.error(`[Vencimientos] No se pudo registrar alerta para ${lote.lote}: ${error.message}`);
      }
    }
  }
  return resultados;
}

export async function listarAlertasVencimientoService() {
  return listarLotesVencidosSinDespacho();
}
