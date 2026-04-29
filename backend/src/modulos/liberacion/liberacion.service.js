import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarEventoLiberacion } from '../blockchain/blockchain.service.js';
import {
  buscarLoteProductoPorCodigo,
  crearLiberacionProducto,
  listarLiberaciones,
  registrarEventoTrazabilidad
} from './liberacion.repository.js';

export async function crearLiberacionService(data, actor) {
  const lote = await buscarLoteProductoPorCodigo(data.lote_producto);
  if (!lote) throw new ErrorHttp(404, 'Lote de producto terminado no encontrado');

  const liberacion = await crearLiberacionProducto({ ...data, lote_producto_id: lote.id });

  await registrarEventoTrazabilidad({
    recepcion_id: null,
    lote: lote.lote_producto,
    tipo_evento: 'PRODUCT_RELEASE_RECORDED',
    actor,
    payload: {
      estado_liberacion: liberacion.estado_liberacion,
      unidades_liberadas: liberacion.unidades_liberadas,
      peso_neto: liberacion.peso_neto,
      fecha_vencimiento: liberacion.fecha_vencimiento
    }
  });

  await registrarEventoLiberacion({
    lote: lote.lote_producto,
    usuario: actor,
    producto: liberacion.producto,
    unidadesLiberadas: liberacion.unidades_liberadas,
    pesoNeto: liberacion.peso_neto,
    fechaVencimiento: liberacion.fecha_vencimiento,
    estadoLiberacion: liberacion.estado_liberacion
  });

  return { ...liberacion, lote_producto: lote.lote_producto };
}

export async function listarLiberacionesService() {
  return listarLiberaciones();
}
