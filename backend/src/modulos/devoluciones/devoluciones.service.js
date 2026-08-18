import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarEventoCritico, registrarVersionEventoCritico } from '../blockchain/blockchain.service.js';
import { buscarContextoLote, buscarDetalleDespachado, crearCaso, ejecutarTransaccionDevolucion, listarCasos, resolverCaso } from './devoluciones.repository.js';

export const listarCasosService = (lote) => listarCasos(lote);

export function cantidadPendienteDevolucion(detalle) {
  return Math.max(0, Number(detalle.cantidad_despachada) - Number(detalle.cantidad_devuelta_registrada || 0));
}

export function impactoInventarioSeguro(tipoCaso) {
  return tipoCaso === 'devolucion_post_despacho' ? 'retenido_pendiente_disposicion' : 'no_aplica';
}

export async function crearCasoService(data, usuario) {
  const registro = await ejecutarTransaccionDevolucion(async (db) => {
    const inventario = await buscarContextoLote(data.lote, db);
    if (!inventario) throw new ErrorHttp(404, 'Lote de producto terminado no encontrado');

    if (data.tipo_caso === 'devolucion_post_despacho') {
      const detalle = await buscarDetalleDespachado(data.id_despacho, data.lote, db);
      if (!detalle || Number(detalle.id_cliente) !== Number(data.id_cliente)) {
        throw new ErrorHttp(400, 'El despacho, cliente y lote no corresponden entre si');
      }
      if (data.cantidad > cantidadPendienteDevolucion(detalle)) {
        throw new ErrorHttp(400, 'La cantidad devuelta acumulada supera la cantidad despachada de este lote');
      }
    } else if (data.cantidad > Number(inventario.unidades_disponibles)) {
      throw new ErrorHttp(400, 'La cantidad rechazada supera las unidades disponibles antes del despacho');
    }

    return crearCaso({
      ...data,
      id_inventario: inventario.id_inventario,
      impacto_inventario: impactoInventarioSeguro(data.tipo_caso),
      creado_por: usuario.sub
    }, db);
  });
  const blockchain = await registrarEventoCritico('devolucion_no_conformidad', registro.id_caso, usuario.email);
  return {
    registro,
    blockchain,
    inventario_modificado: false,
    politica_inventario: data.tipo_caso === 'devolucion_post_despacho'
      ? 'RETENIDO_PENDIENTE_DISPOSICION_NO_REINCORPORABLE_AUTOMATICAMENTE'
      : 'SIN_CAMBIO_AUTOMATICO'
  };
}

export async function resolverCasoService(id, data, usuario) {
  const registro = await resolverCaso(id, data);
  if (!registro) throw new ErrorHttp(409, 'Caso no encontrado o ya tiene una decision registrada');
  const blockchain = await registrarVersionEventoCritico(
    'devolucion_no_conformidad', id, usuario.email, `Decision de no conformidad: ${data.accion}`
  );
  return {
    registro,
    blockchain,
    inventario_modificado: false,
    politica_inventario: registro.tipo_caso === 'devolucion_post_despacho'
      ? 'RETENIDO_PENDIENTE_DISPOSICION_NO_REINCORPORABLE_AUTOMATICAMENTE'
      : 'SIN_CAMBIO_AUTOMATICO'
  };
}
