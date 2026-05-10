import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarEventoCritico } from '../blockchain/blockchain.service.js';
import {
  buscarLiberacionPorManufactura,
  buscarManufacturaPorId,
  buscarUsuarioOperarioPorId,
  crearLiberacionProducto,
  listarPendientesLiberacion,
  listarLiberaciones,
  registrarInventarioProductoTerminado,
  registrarEventoTrazabilidad
} from './liberacion.repository.js';

function validarChecks(data) {
  const completos =
    data.etiqueta_verificada &&
    data.verificacion_envase;

  if (!completos) {
    throw new ErrorHttp(400, 'Debe completar todas las validaciones de liberacion.');
  }
}

export async function listarPendientesLiberacionService() {
  return listarPendientesLiberacion();
}

export async function crearLiberacionService(data, usuario) {
  const manufactura = await buscarManufacturaPorId(data.id_manufactura);
  if (!manufactura) throw new ErrorHttp(404, 'Manufactura registrada no encontrada');

  const liberacionExistente = await buscarLiberacionPorManufactura(data.id_manufactura);
  if (liberacionExistente) throw new ErrorHttp(400, 'Este lote ya tiene liberacion registrada');

  validarChecks(data);

  const responsableLiberacion = await buscarUsuarioOperarioPorId(data.responsable_liberacion_usuario_id);
  if (!responsableLiberacion) {
    throw new ErrorHttp(400, 'Selecciona un operario activo como responsable de la liberacion');
  }

  const liberacion = await crearLiberacionProducto({
    ...data,
    id_orden_produccion: manufactura.id_orden_produccion,
    id_producto: manufactura.id_producto,
    lote_producido: manufactura.lote_producido,
    unidades_producidas: manufactura.unidades_producidas,
    responsable_liberacion: responsableLiberacion.id
  });

  let inventario = null;
  if (liberacion.estado_liberacion === 'aprobado') {
    inventario = await registrarInventarioProductoTerminado({
      id_liberacion: liberacion.id_liberacion,
      producto: manufactura.producto,
      lote: manufactura.lote_producido,
      unidades_disponibles: liberacion.unidades_empacadas,
      fecha_vencimiento: liberacion.fecha_vencimiento
    });
  }

  const evidenciaLiberacion = await registrarEventoCritico('liberacion_producto', liberacion.id_liberacion, usuario.email);
  const evidenciaInventario = inventario?.id_inventario
    ? await registrarEventoCritico('inventario_producto_terminado', inventario.id_inventario, usuario.email)
    : null;

  await registrarEventoTrazabilidad({
    recepcion_id: null,
    lote: manufactura.lote_producido,
    tipo_evento: 'PRODUCT_RELEASE_RECORDED',
    actor: usuario.email,
    payload: {
      evento_futuro_blockchain: 'liberacion_producto',
      orden_produccion_id: manufactura.id_orden_produccion,
      id_manufactura: manufactura.id_manufactura,
      id_liberacion: liberacion.id_liberacion,
      producto: manufactura.producto,
      lote: manufactura.lote_producido,
      unidades: liberacion.unidades_empacadas,
      fecha_vencimiento: liberacion.fecha_vencimiento,
      numero_factura: liberacion.numero_factura,
      conductor: liberacion.conductor,
      placa_vehiculo: liberacion.placa_vehiculo,
      limpieza_vehiculo: liberacion.limpieza_vehiculo,
      documentacion_dotacion: liberacion.documentacion_dotacion,
      validaciones: {
        etiqueta_verificada: liberacion.etiqueta_verificada,
        verificacion_envase: liberacion.verificacion_envase
      },
      responsable_liberacion: responsableLiberacion.email,
      registrado_por: usuario.email,
      estado_liberacion: liberacion.estado_liberacion,
      listo_para_despacho: liberacion.estado_liberacion === 'aprobado'
    }
  });

  return {
    ...liberacion,
    producto: manufactura.producto,
    codigo_orden: manufactura.codigo_orden,
    responsable_liberacion_email: responsableLiberacion.email,
    inventario,
    blockchain: {
      liberacion: evidenciaLiberacion,
      inventario: evidenciaInventario
    }
  };
}

export async function listarLiberacionesService() {
  return listarLiberaciones();
}
