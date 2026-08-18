import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, fechaSimple, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadInventarioProductoTerminado(idInventario) {
  const { rows } = await poolPostgres.query(
    `SELECT ipt.*, lp.estado_liberacion, lp.responsable_liberacion,
            u.email AS responsable_liberacion_email
     FROM inventario_producto_terminado ipt
     JOIN liberacion_producto lp ON lp.id_liberacion = ipt.id_liberacion
     LEFT JOIN users u ON u.id = lp.responsable_liberacion
     WHERE ipt.id_inventario = $1`,
    [idInventario]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'inventario_producto_terminado',
    inventario: {
      producto: texto(row.producto),
      lote: texto(row.lote),
      unidades_liberadas: numero(row.unidades_liberadas),
      unidades_despachadas_iniciales: row.es_heredado ? numero(row.unidades_despachadas) : 0,
      unidades_disponibles_iniciales: row.es_heredado
        ? numero(row.unidades_disponibles)
        : numero(row.unidades_liberadas),
      fecha_vencimiento: fechaSimple(row.fecha_vencimiento),
      estado_liberacion: texto(row.estado_liberacion)
    }
  };

  return {
    tipoEvento: 'inventario_producto_terminado',
    idEntidad: idInventario,
    lote: texto(row.lote),
    actor: texto(row.responsable_liberacion_email || 'sistema'),
    fechaEvento: fechaISO(row.created_at),
    payload: ordenarValor(payload)
  };
}

export async function construirInicializacionInventarioTerminado(idInventario) {
  const evento = await construirPayloadInventarioProductoTerminado(idInventario);
  if (!evento) return null;
  const inventario = evento.payload.inventario;
  return ordenarValor({
    idInventario: String(evento.idEntidad),
    idLiberacion: String((await poolPostgres.query(
      'SELECT id_liberacion FROM inventario_producto_terminado WHERE id_inventario = $1',
      [idInventario]
    )).rows[0].id_liberacion),
    lote: evento.lote,
    producto: inventario.producto,
    unidadesLiberadas: inventario.unidades_liberadas,
    unidadesDespachadas: inventario.unidades_despachadas_iniciales,
    unidadesDisponibles: inventario.unidades_disponibles_iniciales,
    fechaVencimiento: inventario.fecha_vencimiento,
    estadoLiberacion: inventario.estado_liberacion,
    actor: evento.actor,
    fechaEvento: evento.fechaEvento,
    payload: evento.payload
  });
}
