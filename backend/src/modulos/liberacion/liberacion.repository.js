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
       rm.unidades_producidas,
       rm.created_at AS fecha_manufactura,
       rm.registrado_por AS responsable_manufactura
     FROM registro_manufactura rm
     JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
     LEFT JOIN liberacion_producto lp ON lp.id_manufactura = rm.id_manufactura
     WHERE lp.id_liberacion IS NULL
       AND rm.lote_producido IS NOT NULL
     ORDER BY rm.created_at ASC`
  );
  return rows;
}

export async function buscarManufacturaPorId(idManufactura) {
  const { rows } = await poolPostgres.query(
    `SELECT
       rm.id_manufactura,
       rm.id_orden_produccion,
       rm.id_producto,
       op.codigo_orden,
       rm.lote_producido,
       rm.unidades_producidas,
       rm.created_at AS fecha_manufactura,
       rm.registrado_por AS responsable_manufactura,
       opp.producto,
       opp.tamano_presentacion,
       opp.estado_manufactura
     FROM registro_manufactura rm
     JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
     WHERE rm.id_manufactura = $1`,
    [idManufactura]
  );
  return rows[0] || null;
}

export async function buscarLiberacionPorManufactura(idManufactura) {
  const { rows } = await poolPostgres.query(
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

export async function crearLiberacionProducto(data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO liberacion_producto (
      id_manufactura,
      id_orden_produccion,
      id_producto,
      lote_producido,
      fecha_liberacion,
      responsable_liberacion,
      tipo_empaque,
      numero_factura,
      conductor,
      placa_vehiculo,
      limpieza_vehiculo,
      documentacion_dotacion,
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
     VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
     RETURNING *`,
    [
      data.id_manufactura,
      data.id_orden_produccion,
      data.id_producto,
      data.lote_producido,
      data.responsable_liberacion,
      data.tipo_empaque,
      data.numero_factura,
      data.conductor,
      data.placa_vehiculo,
      data.limpieza_vehiculo,
      data.documentacion_dotacion,
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

export async function registrarEventoTrazabilidad(data) {
  await poolPostgres.query(
    `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.recepcion_id, data.lote, data.tipo_evento, data.actor, JSON.stringify(data.payload || {})]
  );
}
