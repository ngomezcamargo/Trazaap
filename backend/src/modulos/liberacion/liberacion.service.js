import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarAlertaVencimiento } from '../blockchain/blockchain.service.js';
import { encolarEventoBlockchain } from '../blockchain/outbox.repository.js';
import {
  actualizarAlmacenamientoDesdeLiberacion,
  buscarLiberacionPorManufactura,
  buscarManufacturaPorId,
  buscarUsuarioOperarioPorId,
  crearInventarioProductoTerminadoDesdeLiberacion,
  crearLiberacionProducto,
  ejecutarTransaccionLiberacion,
  listarLiberaciones,
  listarLotesVencidosSinDespacho,
  listarPendientesLiberacion,
  registrarEventoTrazabilidad
} from './liberacion.repository.js';

const dependenciasPredeterminadas = {
  actualizarAlmacenamientoDesdeLiberacion,
  buscarLiberacionPorManufactura,
  buscarManufacturaPorId,
  buscarUsuarioOperarioPorId,
  crearInventarioProductoTerminadoDesdeLiberacion,
  crearLiberacionProducto,
  ejecutarTransaccionLiberacion,
  listarLiberaciones,
  listarPendientesLiberacion,
  registrarEventoTrazabilidad,
  encolarEventoBlockchain
};

function validarChecks(data) {
  if (!data.etiqueta_verificada || !data.verificacion_envase) {
    throw new ErrorHttp(400, 'Debe completar todas las validaciones de liberacion.');
  }
}

export function listarPendientesLiberacionService() {
  return listarPendientesLiberacion();
}

export async function crearLiberacionService(data, usuario, deps = dependenciasPredeterminadas) {
  const manufactura = await deps.buscarManufacturaPorId(data.id_manufactura);
  if (!manufactura) throw new ErrorHttp(404, 'Manufactura registrada no encontrada');
  if (!manufactura.id_almacenamiento || manufactura.estado_almacenamiento !== 'listo_para_liberacion') {
    throw new ErrorHttp(422, 'El lote debe completar el almacenamiento y quedar listo para liberacion.');
  }
  if (await deps.buscarLiberacionPorManufactura(data.id_manufactura)) {
    throw new ErrorHttp(400, 'Este lote ya tiene liberacion registrada');
  }

  validarChecks(data);
  if (Number(data.unidades_empacadas) > Number(manufactura.unidades_producidas)) {
    throw new ErrorHttp(400, 'Las unidades liberadas no pueden superar las unidades producidas');
  }
  if (
    manufactura.fecha_vencimiento_calculada &&
    data.fecha_vencimiento !== String(manufactura.fecha_vencimiento_calculada).slice(0, 10)
  ) {
    throw new ErrorHttp(400, 'La fecha de vencimiento debe coincidir con la fecha calculada del producto.');
  }

  const responsableLiberacion = await deps.buscarUsuarioOperarioPorId(data.responsable_liberacion_usuario_id);
  if (!responsableLiberacion) {
    throw new ErrorHttp(400, 'Selecciona un operario activo como responsable de la liberacion');
  }

  const resultado = await deps.ejecutarTransaccionLiberacion(async (db) => {
    if (await deps.buscarLiberacionPorManufactura(data.id_manufactura, db)) {
      throw new ErrorHttp(409, 'Este lote ya tiene liberacion registrada');
    }

    const liberacion = await deps.crearLiberacionProducto({
      ...data,
      fecha_vencimiento: manufactura.fecha_vencimiento_calculada || data.fecha_vencimiento,
      id_orden_produccion: manufactura.id_orden_produccion,
      id_producto: manufactura.id_producto,
      lote_producido: manufactura.lote_producido,
      unidades_producidas: manufactura.unidades_producidas,
      responsable_liberacion: responsableLiberacion.id
    }, db);

    await deps.encolarEventoBlockchain({
      tipoEvento: 'liberacion_producto',
      idEntidad: liberacion.id_liberacion,
      actor: usuario.email
    }, db);

    let inventarioTerminado = null;
    if (liberacion.estado_liberacion === 'aprobado') {
      inventarioTerminado = await deps.crearInventarioProductoTerminadoDesdeLiberacion({
        id_liberacion: liberacion.id_liberacion,
        producto: manufactura.producto,
        lote: manufactura.lote_producido,
        unidades_liberadas: liberacion.unidades_empacadas,
        fecha_vencimiento: liberacion.fecha_vencimiento,
        estado: 'disponible'
      }, db);
      await deps.encolarEventoBlockchain({
        tipoEvento: 'inventario_producto_terminado',
        idEntidad: inventarioTerminado.id_inventario,
        operacion: 'inicializar_inventario_terminado',
        actor: usuario.email
      }, db);
    }

    const estadoAlmacenamiento = liberacion.estado_liberacion === 'aprobado'
      ? 'liberado'
      : liberacion.estado_liberacion === 'rechazado' ? 'rechazado' : 'retenido';
    const almacenamiento = await deps.actualizarAlmacenamientoDesdeLiberacion(
      manufactura.id_almacenamiento,
      estadoAlmacenamiento,
      db
    );
    if (!almacenamiento) {
      throw new ErrorHttp(409, 'El estado de almacenamiento cambio antes de completar la liberacion.');
    }

    await deps.registrarEventoTrazabilidad({
      recepcion_id: null,
      lote: manufactura.lote_producido,
      tipo_evento: 'PRODUCT_RELEASE_RECORDED',
      actor: usuario.email,
      payload: {
        id_manufactura: manufactura.id_manufactura,
        id_liberacion: liberacion.id_liberacion,
        producto: manufactura.producto,
        lote: manufactura.lote_producido,
        unidades_liberadas: liberacion.unidades_empacadas,
        estado_liberacion: liberacion.estado_liberacion
      }
    }, db);

    return { liberacion, inventarioTerminado, almacenamiento };
  });

  return {
    ...resultado.liberacion,
    producto: manufactura.producto,
    codigo_orden: manufactura.codigo_orden,
    responsable_liberacion_email: responsableLiberacion.email,
    inventario_producto_terminado: resultado.inventarioTerminado,
    blockchain: {
      estado: 'PENDIENTE',
      mensaje: 'La liberacion y el inventario fueron encolados para Hyperledger Fabric'
    }
  };
}

export function listarLiberacionesService() {
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

export function listarAlertasVencimientoService() {
  return listarLotesVencidosSinDespacho();
}
