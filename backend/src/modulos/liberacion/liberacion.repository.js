import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarPendientesLiberacion() {
  const { rows } = await poolPostgres.query(
    `SELECT
       rm.id_manufactura,
       rm.id_orden_produccion,
       op.codigo_orden,
       rm.id_producto,
       opp.producto,
       opp.tamano_presentacion,
       opp.estado_manufactura,
       rm.lote_producido,
       to_char(COALESCE(rm.fecha_vencimiento_calculada, op.fecha_produccion + pf.vida_util_dias), 'YYYY-MM-DD') AS fecha_vencimiento_calculada,
       rm.unidades_producidas,
       rm.created_at AS fecha_manufactura,
       rm.registrado_por AS responsable_manufactura
     FROM registro_manufactura rm
     JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
     LEFT JOIN productos_fabricados pf ON pf.id = opp.producto_fabricado_id
     LEFT JOIN liberacion_producto lp ON lp.id_manufactura = rm.id_manufactura
     JOIN almacenamientos_lote al ON al.id_manufactura = rm.id_manufactura
     WHERE lp.id_liberacion IS NULL
       AND rm.lote_producido IS NOT NULL
       AND al.estado = 'listo_para_liberacion'
     ORDER BY rm.created_at ASC`
  );
  return rows;
}

export async function buscarManufacturaPorId(idManufactura) {
  const { rows } = await poolPostgres.query(
    `SELECT
       rm.*,
       rm.id_orden_produccion,
       rm.id_producto,
       op.codigo_orden,
       rm.lote_producido,
       to_char(COALESCE(rm.fecha_vencimiento_calculada, op.fecha_produccion + pf.vida_util_dias), 'YYYY-MM-DD') AS fecha_vencimiento_calculada,
       rm.unidades_producidas,
       rm.created_at AS fecha_manufactura,
       COALESCE(um.email, rm.registrado_por) AS responsable_manufactura,
       opp.producto,
       opp.tamano_presentacion,
       opp.estado_manufactura,
       pf.requiere_inmersion,
       pf.tiempo_fermentacion_minutos,
       pf.temperatura_fermentacion_c,
       pf.tiempo_horneado_minutos,
       pf.temperatura_horneado_c,
       pf.tiempo_inmersion_minutos,
       pf.temperatura_inmersion_c
       ,al.id_almacenamiento
       ,al.estado AS estado_almacenamiento
       ,al.temperatura_salida_c AS temperatura_salida_almacenamiento_c
       ,al.fecha_salida AS fecha_salida_almacenamiento
     FROM registro_manufactura rm
     JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
     LEFT JOIN productos_fabricados pf ON pf.id = opp.producto_fabricado_id
     LEFT JOIN users um ON um.id = rm.registrado_por_usuario_id
     LEFT JOIN almacenamientos_lote al ON al.id_manufactura = rm.id_manufactura
     WHERE rm.id_manufactura = $1`,
    [idManufactura]
  );
  return rows[0] || null;
}

export async function buscarLiberacionPorManufactura(idManufactura, db = poolPostgres) {
  const { rows } = await db.query(
    'SELECT * FROM liberacion_producto WHERE id_manufactura = $1',
    [idManufactura]
  );
  return rows[0] || null;
}

export async function buscarUsuarioOperarioPorId(id) {
  const { rows } = await poolPostgres.query(
    `SELECT u.id, u.email, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1
       AND u.is_active = true
       AND lower(r.name) = 'operario'`,
    [id]
  );
  return rows[0] || null;
}

export async function crearLiberacionProducto(data, db = poolPostgres) {
  const { rows } = await db.query(
    `INSERT INTO liberacion_producto (
      id_manufactura,
      id_orden_produccion,
      id_producto,
      lote_producido,
      fecha_liberacion,
      responsable_liberacion,
      tipo_empaque,
      unidades_producidas,
      unidades_empacadas,
      peso_neto,
      fecha_vencimiento,
      etiqueta_verificada,
      verificacion_envase,
      lote_visible,
      fecha_vencimiento_visible,
      empaque_conforme,
      producto_en_buen_estado,
      estado_liberacion,
      motivo_retencion,
      motivo_rechazo,
      observaciones
    )
     VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING *`,
    [
      data.id_manufactura,
      data.id_orden_produccion,
      data.id_producto,
      data.lote_producido,
      data.responsable_liberacion,
      data.tipo_empaque,
      data.unidades_producidas,
      data.unidades_empacadas,
      data.peso_neto,
      data.fecha_vencimiento,
      data.etiqueta_verificada,
      data.verificacion_envase,
      true,
      true,
      data.verificacion_envase,
      true,
      data.estado_liberacion,
      data.motivo_retencion || '',
      data.motivo_rechazo || '',
      data.observaciones
    ]
  );
  return rows[0];
}

export async function crearInventarioProductoTerminadoDesdeLiberacion(data, db = poolPostgres) {
  const { rows } = await db.query(
    `INSERT INTO inventario_producto_terminado (
      id_liberacion,
      producto,
      lote,
      unidades_liberadas,
      unidades_reservadas,
      unidades_despachadas,
      unidades_disponibles,
      fecha_vencimiento,
      estado
    )
     VALUES ($1, $2, $3, $4, 0, 0, $4, $5, $6)
     ON CONFLICT (id_liberacion) DO UPDATE SET
      producto = EXCLUDED.producto,
      lote = EXCLUDED.lote,
      unidades_liberadas = EXCLUDED.unidades_liberadas,
      unidades_reservadas = EXCLUDED.unidades_reservadas,
      unidades_despachadas = EXCLUDED.unidades_despachadas,
      unidades_disponibles = EXCLUDED.unidades_disponibles,
       fecha_vencimiento = EXCLUDED.fecha_vencimiento,
       estado = EXCLUDED.estado,
       updated_at = NOW()
     RETURNING *`,
    [
      data.id_liberacion,
      data.producto,
      data.lote,
      data.unidades_liberadas,
      data.fecha_vencimiento,
      data.estado
    ]
  );
  return rows[0];
}

export async function actualizarAlmacenamientoDesdeLiberacion(idAlmacenamiento, estado, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE almacenamientos_lote
     SET estado = $2, updated_at = NOW()
     WHERE id_almacenamiento = $1 AND estado = 'listo_para_liberacion'
     RETURNING *`,
    [idAlmacenamiento, estado]
  );
  return rows[0] || null;
}

export async function listarLiberaciones() {
  const { rows } = await poolPostgres.query(
    `SELECT
       lp.*,
       rm.lote_producido,
       rm.registrado_por AS responsable_manufactura,
       rm.created_at AS fecha_manufactura,
       op.codigo_orden,
       opp.producto,
       opp.tamano_presentacion,
       u.email AS responsable_liberacion_email
     FROM liberacion_producto lp
     JOIN registro_manufactura rm ON rm.id_manufactura = lp.id_manufactura
     JOIN ordenes_produccion op ON op.id = lp.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = lp.id_producto
     LEFT JOIN users u ON u.id = lp.responsable_liberacion
     ORDER BY lp.id_liberacion DESC`
  );
  return rows;
}

export async function registrarEventoTrazabilidad(data, db = poolPostgres) {
  await db.query(
    `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.recepcion_id, data.lote, data.tipo_evento, data.actor, JSON.stringify(data.payload || {})]
  );
}

export async function ejecutarTransaccionLiberacion(callback) {
  const client = await poolPostgres.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listarLotesVencidosSinDespacho() {
  const { rows } = await poolPostgres.query(
    `SELECT id_inventario, id_liberacion, producto, lote, unidades_disponibles,
            fecha_vencimiento, estado
     FROM inventario_producto_terminado
     WHERE fecha_vencimiento <= CURRENT_DATE
       AND unidades_disponibles > 0
       AND estado IN ('disponible', 'despacho_parcial')
     ORDER BY fecha_vencimiento, lote`
  );
  return rows;
}
