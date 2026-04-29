import { poolPostgres } from '../../configuracion/postgresql.js';

export async function buscarLoteProductoPorCodigo(loteProducto) {
  const { rows } = await poolPostgres.query(
    'SELECT lpt.*, op.producto FROM lotes_producto_terminado lpt JOIN ordenes_produccion op ON op.id = lpt.orden_produccion_id WHERE lpt.lote_producto = $1',
    [loteProducto]
  );
  return rows[0] || null;
}

export async function crearLiberacionProducto(data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO liberaciones_producto (
      lote_producto_id, producto, fecha_vencimiento, unidades_liberadas, peso_neto,
      verificacion_etiqueta, verificacion_envase, numero_factura, cliente_destino,
      conductor, placa_vehiculo, limpieza_vehiculo, documentacion_dotacion,
      responsable_liberacion, estado_liberacion, observaciones
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      data.lote_producto_id,
      data.producto,
      data.fecha_vencimiento,
      data.unidades_liberadas,
      data.peso_neto,
      data.verificacion_etiqueta,
      data.verificacion_envase,
      data.numero_factura,
      data.cliente_destino,
      data.conductor,
      data.placa_vehiculo,
      data.limpieza_vehiculo,
      data.documentacion_dotacion,
      data.responsable_liberacion,
      data.estado_liberacion,
      data.observaciones
    ]
  );
  return rows[0];
}

export async function listarLiberaciones() {
  const { rows } = await poolPostgres.query(
    `SELECT lp.*, lpt.lote_producto
     FROM liberaciones_producto lp
     JOIN lotes_producto_terminado lpt ON lpt.id = lp.lote_producto_id
     ORDER BY lp.id DESC`
  );
  return rows;
}

export async function registrarEventoTrazabilidad(data) {
  await poolPostgres.query(
    `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.recepcion_id, data.lote, data.tipo_evento, data.actor, JSON.stringify(data.payload || {})]
  );
}
