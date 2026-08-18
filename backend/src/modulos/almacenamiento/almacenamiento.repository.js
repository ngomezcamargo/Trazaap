import { poolPostgres } from '../../configuracion/postgresql.js';

const SELECT_ALMACENAMIENTO = `
  SELECT al.*,
         op.codigo_orden,
         opp.producto,
         opp.tamano_presentacion,
         rm.unidades_producidas,
         rm.created_at AS fecha_manufactura,
         COALESCE(um.email, rm.registrado_por) AS responsable_manufactura,
         pf.condiciones_almacenamiento,
         ua.nombre AS ubicacion,
         ui.email AS responsable_ingreso_email,
         us.email AS responsable_salida_email,
         ur.email AS responsable_resolucion_email
  FROM almacenamientos_lote al
  JOIN registro_manufactura rm ON rm.id_manufactura = al.id_manufactura
  JOIN ordenes_produccion op ON op.id = al.id_orden_produccion
  JOIN ordenes_produccion_productos opp ON opp.id = al.id_producto
  LEFT JOIN productos_fabricados pf ON pf.id = opp.producto_fabricado_id
  JOIN ubicaciones_almacenamiento ua ON ua.id_ubicacion = al.id_ubicacion
  LEFT JOIN users um ON um.id = rm.registrado_por_usuario_id
  LEFT JOIN users ui ON ui.id = al.responsable_ingreso
  LEFT JOIN users us ON us.id = al.responsable_salida
  LEFT JOIN users ur ON ur.id = al.responsable_resolucion`;

export async function ejecutarTransaccionAlmacenamiento(callback) {
  const client = await poolPostgres.connect();
  try {
    await client.query('BEGIN');
    const resultado = await callback(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listarPendientesAlmacenamiento() {
  const { rows } = await poolPostgres.query(
    `SELECT rm.id_manufactura, rm.id_orden_produccion, rm.id_producto,
            rm.lote_producido, rm.unidades_producidas, rm.created_at AS fecha_manufactura,
            COALESCE(u.email, rm.registrado_por) AS responsable_manufactura,
            op.codigo_orden, opp.producto, opp.tamano_presentacion,
            pf.condiciones_almacenamiento,
            pf.temperatura_almacenamiento_min_c,
            pf.temperatura_almacenamiento_max_c,
            pf.requiere_refrigeracion
     FROM registro_manufactura rm
     JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
     JOIN productos_fabricados pf ON pf.id = opp.producto_fabricado_id
     LEFT JOIN users u ON u.id = rm.registrado_por_usuario_id
     LEFT JOIN almacenamientos_lote al ON al.id_manufactura = rm.id_manufactura
     LEFT JOIN liberacion_producto lp ON lp.id_manufactura = rm.id_manufactura
     WHERE al.id_almacenamiento IS NULL AND lp.id_liberacion IS NULL
     ORDER BY rm.created_at, rm.id_manufactura`
  );
  return rows;
}

export async function buscarManufacturaParaAlmacenamiento(idManufactura, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT rm.*, op.codigo_orden, opp.producto, opp.tamano_presentacion,
            pf.condiciones_almacenamiento,
            pf.temperatura_almacenamiento_min_c,
            pf.temperatura_almacenamiento_max_c,
            pf.requiere_refrigeracion,
            COALESCE(u.email, rm.registrado_por) AS responsable_manufactura
     FROM registro_manufactura rm
     JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
     JOIN productos_fabricados pf ON pf.id = opp.producto_fabricado_id
     LEFT JOIN users u ON u.id = rm.registrado_por_usuario_id
     WHERE rm.id_manufactura = $1
     FOR UPDATE OF rm`,
    [idManufactura]
  );
  return rows[0] || null;
}

export async function buscarAlmacenamientoPorManufactura(idManufactura, db = poolPostgres) {
  const { rows } = await db.query(
    'SELECT * FROM almacenamientos_lote WHERE id_manufactura = $1 ORDER BY id_almacenamiento DESC LIMIT 1',
    [idManufactura]
  );
  return rows[0] || null;
}

export async function buscarAlmacenamientoPorId(id, db = poolPostgres, bloquear = false) {
  const { rows } = await db.query(
    `${SELECT_ALMACENAMIENTO} WHERE al.id_almacenamiento = $1${bloquear ? ' FOR UPDATE OF al' : ''}`,
    [id]
  );
  return rows[0] || null;
}

export async function listarAlmacenamientos({ estado = '' } = {}) {
  const { rows } = await poolPostgres.query(
    `${SELECT_ALMACENAMIENTO}
     WHERE ($1 = '' OR al.estado = $1)
     ORDER BY al.created_at DESC`,
    [estado]
  );
  return rows;
}

export async function listarControlesAlmacenamiento(idAlmacenamiento, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT ca.*, u.email AS responsable_control_email
     FROM controles_almacenamiento ca
     LEFT JOIN users u ON u.id = ca.responsable_control
     WHERE ca.id_almacenamiento = $1
     ORDER BY ca.fecha_control, ca.id_control`,
    [idAlmacenamiento]
  );
  return rows;
}

export async function listarUbicaciones({ incluirInactivas = false } = {}) {
  const { rows } = await poolPostgres.query(
    `SELECT * FROM ubicaciones_almacenamiento
     WHERE ($1::BOOLEAN = true OR activo = true)
     ORDER BY activo DESC, nombre`,
    [incluirInactivas]
  );
  return rows;
}

export async function buscarUbicacionActiva(id, db = poolPostgres) {
  const { rows } = await db.query(
    'SELECT * FROM ubicaciones_almacenamiento WHERE id_ubicacion = $1 AND activo = true',
    [id]
  );
  return rows[0] || null;
}

export async function crearUbicacion(data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO ubicaciones_almacenamiento (nombre, descripcion, tipo, activo)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.nombre, data.descripcion || '', data.tipo, data.activo]
  );
  return rows[0];
}

export async function actualizarUbicacion(id, data) {
  const { rows } = await poolPostgres.query(
    `UPDATE ubicaciones_almacenamiento
     SET nombre = $2, descripcion = $3, tipo = $4, activo = $5, updated_at = NOW()
     WHERE id_ubicacion = $1
     RETURNING *`,
    [id, data.nombre, data.descripcion || '', data.tipo, data.activo]
  );
  return rows[0] || null;
}

export async function crearIngresoAlmacenamiento(data, db = poolPostgres) {
  const { rows } = await db.query(
    `INSERT INTO almacenamientos_lote (
       id_manufactura, id_orden_produccion, id_producto, lote_producido, id_ubicacion,
       temperatura_min_esperada_c, temperatura_max_esperada_c, temperatura_ingreso_c,
       requiere_refrigeracion, estado, observaciones_ingreso, responsable_ingreso
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.id_manufactura, data.id_orden_produccion, data.id_producto, data.lote_producido,
      data.id_ubicacion, data.temperatura_min_esperada_c, data.temperatura_max_esperada_c,
      data.temperatura_ingreso_c, data.requiere_refrigeracion, data.estado,
      data.observaciones_ingreso || '', data.responsable_ingreso
    ]
  );
  return rows[0];
}

export async function crearControlAlmacenamiento(data, db = poolPostgres) {
  const { rows } = await db.query(
    `INSERT INTO controles_almacenamiento (
       id_almacenamiento, temperatura_c, condicion_general, resultado, observaciones, responsable_control
     ) VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [data.id_almacenamiento, data.temperatura_c, data.condicion_general, data.resultado,
      data.observaciones || '', data.responsable_control]
  );
  return rows[0];
}

export async function actualizarEstadoAlmacenamiento(id, estado, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE almacenamientos_lote SET estado = $2, updated_at = NOW()
     WHERE id_almacenamiento = $1 RETURNING *`,
    [id, estado]
  );
  return rows[0] || null;
}

export async function registrarSalidaAlmacenamiento(id, data, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE almacenamientos_lote
     SET fecha_salida = NOW(), temperatura_salida_c = $2, estado_producto_salida = $3,
         decision_salida = $4, observaciones_salida = $5, responsable_salida = $6,
         estado = $7, updated_at = NOW()
     WHERE id_almacenamiento = $1 AND fecha_salida IS NULL
     RETURNING *`,
    [id, data.temperatura_salida_c, data.estado_producto_salida, data.decision_salida,
      data.observaciones_salida || '', data.responsable_salida, data.estado]
  );
  return rows[0] || null;
}

export async function registrarResolucionAlmacenamiento(id, data, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE almacenamientos_lote
     SET resolucion_fecha = NOW(), resolucion_decision = $2, resolucion_motivo = $3,
         resolucion_observaciones = $4, responsable_resolucion = $5,
         estado = $6, updated_at = NOW()
     WHERE id_almacenamiento = $1
     RETURNING *`,
    [id, data.decision, data.motivo, data.observaciones || '', data.responsable_resolucion, data.estado]
  );
  return rows[0] || null;
}

export async function marcarAlmacenamientoDespachado(id, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE almacenamientos_lote SET estado = 'despachado', updated_at = NOW()
     WHERE id_almacenamiento = $1 AND estado = 'listo_para_liberacion'
     RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

export async function registrarEventoTrazabilidadAlmacenamiento(data, db = poolPostgres) {
  await db.query(
    `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
     VALUES (NULL, $1, $2, $3, $4)`,
    [data.lote, data.tipo_evento, data.actor, JSON.stringify(data.payload || {})]
  );
}

