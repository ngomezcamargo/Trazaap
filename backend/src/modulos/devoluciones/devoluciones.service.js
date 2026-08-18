import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarEventoCritico, registrarVersionEventoCritico } from '../blockchain/blockchain.service.js';
import { buscarContextoLote, buscarDetalleDespachado, crearCaso, listarCasos, resolverCaso } from './devoluciones.repository.js';

export const listarCasosService = (lote) => listarCasos(lote);

export async function crearCasoService(data, usuario) {
  const inventario = await buscarContextoLote(data.lote);
  if (!inventario) throw new ErrorHttp(404, 'Lote de producto terminado no encontrado');

  if (data.tipo_caso === 'devolucion_post_despacho') {
    const detalle = await buscarDetalleDespachado(data.id_despacho, data.lote);
    if (!detalle || Number(detalle.id_cliente) !== Number(data.id_cliente)) {
      throw new ErrorHttp(400, 'El despacho, cliente y lote no corresponden entre si');
    }
    if (data.cantidad > Number(detalle.cantidad_despachada)) {
      throw new ErrorHttp(400, 'La cantidad devuelta supera la cantidad despachada de este lote');
    }
  } else if (data.cantidad > Number(inventario.unidades_disponibles)) {
    throw new ErrorHttp(400, 'La cantidad rechazada supera las unidades disponibles antes del despacho');
  }

  const registro = await crearCaso({
    ...data,
    id_inventario: inventario.id_inventario,
    impacto_inventario: data.tipo_caso === 'devolucion_post_despacho' ? 'pendiente_definicion' : 'no_aplica',
    creado_por: usuario.sub
  });
  const blockchain = await registrarEventoCritico('devolucion_no_conformidad', registro.id_caso, usuario.email);
  return {
    registro,
    blockchain,
    inventario_modificado: false,
    bloqueo: data.tipo_caso === 'devolucion_post_despacho'
      ? 'BLOQUEADO POR DEFINICION DE POLITICA DE REINCORPORACION A INVENTARIO'
      : null
  };
}

export async function resolverCasoService(id, data, usuario) {
  const registro = await resolverCaso(id, data);
  if (!registro) throw new ErrorHttp(409, 'Caso no encontrado o ya tiene una decision registrada');
  const blockchain = await registrarVersionEventoCritico(
    'devolucion_no_conformidad', id, usuario.email, `Decision de no conformidad: ${data.accion}`
  );
  return { registro, blockchain, inventario_modificado: false,
    bloqueo: registro.tipo_caso === 'devolucion_post_despacho'
      ? 'BLOQUEADO POR DEFINICION DE POLITICA DE REINCORPORACION A INVENTARIO' : null };
}
