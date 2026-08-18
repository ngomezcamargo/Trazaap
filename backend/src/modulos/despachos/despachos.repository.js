import { poolPostgres } from '../../configuracion/postgresql.js';

function consultaDespachosBase(where = '') {
  return `
    SELECT
      d.*,
      c.nombre_razon_social AS cliente,
      c.nit_documento AS cliente_documento,
      c.nombre_contacto AS cliente_contacto,
      c.telefono AS cliente_telefono,
      c.email AS cliente_email,
      c.direccion AS cliente_direccion,
      u.email AS responsable_despacho_email,
      ce.id_confirmacion,
      ce.receptor,
      ce.fecha_recepcion,
      ce.temperatura_entrega_c AS temperatura_confirmada_c,
      ce.observaciones AS observaciones_confirmacion,
      ce.estado_confirmacion,
      COALESCE(det.detalles, '[]'::JSON) AS detalles
    FROM despachos d
    LEFT JOIN clientes c ON c.id_cliente = d.id_cliente
    JOIN users u ON u.id = d.responsable_despacho
    LEFT JOIN confirmaciones_entrega ce ON ce.id_despacho = d.id_despacho
    LEFT JOIN LATERAL (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'id_detalle', dd.id_detalle,
          'id_inventario_producto_terminado', dd.id_inventario_producto_terminado,
          'id_liberacion', dd.id_liberacion,
          'cantidad_despachada', dd.cantidad_despachada,
          'producto', ipt.producto,
          'lote', ipt.lote,
          'fecha_vencimiento', ipt.fecha_vencimiento,
          'unidades_liberadas', ipt.unidades_liberadas,
          'unidades_reservadas', ipt.unidades_reservadas,
          'unidades_despachadas', ipt.unidades_despachadas,
          'unidades_disponibles', ipt.unidades_disponibles,
          'estado_inventario', ipt.estado,
          'id_manufactura', lp.id_manufactura,
          'estado_liberacion', lp.estado_liberacion,
          'tipo_empaque', lp.tipo_empaque,
          'peso_neto', lp.peso_neto,
          'codigo_orden', op.codigo_orden,
          'tamano_presentacion', opp.tamano_presentacion,
          'id_almacenamiento', al.id_almacenamiento,
          'estado_almacenamiento', al.estado,
          'temperatura_min_esperada_c', al.temperatura_min_esperada_c,
          'temperatura_max_esperada_c', al.temperatura_max_esperada_c,
          'temperatura_salida_almacenamiento_c', al.temperatura_salida_c
        ) ORDER BY dd.id_detalle
      ) AS detalles
      FROM despacho_detalle dd
      JOIN inventario_producto_terminado ipt ON ipt.id_inventario = dd.id_inventario_producto_terminado
      JOIN liberacion_producto lp ON lp.id_liberacion = dd.id_liberacion
      JOIN ordenes_produccion op ON op.id = lp.id_orden_produccion
      JOIN ordenes_produccion_productos opp ON opp.id = lp.id_producto
      LEFT JOIN almacenamientos_lote al ON al.id_manufactura = lp.id_manufactura
      WHERE dd.id_despacho = d.id_despacho
    ) det ON true
    ${where}`;
}

export async function listarInventariosDespachables() {
  const { rows } = await poolPostgres.query(
    `SELECT
       ipt.*,
       lp.id_manufactura,
       lp.tipo_empaque,
       lp.peso_neto,
       lp.estado_liberacion,
       op.codigo_orden,
       opp.tamano_presentacion,
       al.id_almacenamiento,
       al.estado AS estado_almacenamiento,
       al.temperatura_min_esperada_c,
       al.temperatura_max_esperada_c,
       al.temperatura_salida_c AS temperatura_salida_almacenamiento_c
     FROM inventario_producto_terminado ipt
     JOIN liberacion_producto lp ON lp.id_liberacion = ipt.id_liberacion
     JOIN ordenes_produccion op ON op.id = lp.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = lp.id_producto
     LEFT JOIN almacenamientos_lote al ON al.id_manufactura = lp.id_manufactura
     WHERE lp.estado_liberacion = 'aprobado'
       AND ipt.estado <> 'retenido'
       AND (ipt.unidades_disponibles > 0 OR ipt.unidades_reservadas > 0)
     ORDER BY ipt.updated_at DESC, ipt.lote`
  );
  return rows;
}

export async function listarDespachos() {
  const { rows } = await poolPostgres.query(`${consultaDespachosBase()} ORDER BY d.fecha_despacho DESC, d.id_despacho DESC`);
  return rows;
}

export async function buscarDespachoPorId(id, db = poolPostgres) {
  const { rows } = await db.query(`${consultaDespachosBase('WHERE d.id_despacho = $1')} LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function buscarDespachoSimplePorId(id, db = poolPostgres, bloquear = false) {
  const { rows } = await db.query(
    `SELECT * FROM despachos WHERE id_despacho = $1${bloquear ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
}

export async function buscarDespachosPorLote(lote, db = poolPostgres) {
  const { rows } = await db.query(
    `${consultaDespachosBase(`WHERE EXISTS (
      SELECT 1
      FROM despacho_detalle filtro
      JOIN inventario_producto_terminado inv ON inv.id_inventario = filtro.id_inventario_producto_terminado
      WHERE filtro.id_despacho = d.id_despacho AND inv.lote = $1
    )`)} ORDER BY d.fecha_despacho, d.id_despacho`,
    [lote]
  );
  return rows;
}

export async function bloquearInventarios(ids, db) {
  const { rows } = await db.query(
    `SELECT ipt.*, lp.estado_liberacion, lp.id_manufactura,
            al.estado AS estado_almacenamiento,
            al.temperatura_min_esperada_c,
            al.temperatura_max_esperada_c,
            al.temperatura_salida_c AS temperatura_salida_almacenamiento_c
     FROM inventario_producto_terminado ipt
     JOIN liberacion_producto lp ON lp.id_liberacion = ipt.id_liberacion
     LEFT JOIN almacenamientos_lote al ON al.id_manufactura = lp.id_manufactura
     WHERE ipt.id_inventario = ANY($1::BIGINT[])
     ORDER BY ipt.id_inventario
     FOR UPDATE OF ipt`,
    [ids]
  );
  return rows;
}

export async function siguienteCodigoDespacho(fecha, db) {
  const { rows } = await db.query("SELECT nextval('despachos_codigo_seq') AS consecutivo");
  const numero = String(rows[0].consecutivo).padStart(6, '0');
  const fechaCodigo = new Date(fecha).toISOString().slice(0, 10).replaceAll('-', '');
  return `DES-${fechaCodigo}-${numero}`;
}

export async function crearDespacho(data, db) {
  const { rows } = await db.query(
    `INSERT INTO despachos (
       codigo_despacho, id_cliente, numero_factura, fecha_despacho, responsable_despacho,
       conductor, placa_vehiculo, temperatura_salida_c, temperatura_transporte_c,
       limpieza_vehiculo, documentacion_dotacion, canal_distribucion, observaciones
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      data.codigo_despacho,
      data.id_cliente,
      data.numero_factura,
      data.fecha_despacho,
      data.responsable_despacho,
      data.conductor,
      data.placa_vehiculo,
      data.temperatura_salida_c,
      data.temperatura_transporte_c,
      data.limpieza_vehiculo,
      data.documentacion_dotacion,
      data.canal_distribucion,
      data.observaciones || ''
    ]
  );
  return rows[0];
}

export async function crearDetalleDespacho(data, db) {
  const { rows } = await db.query(
    `INSERT INTO despacho_detalle (
       id_despacho, id_inventario_producto_terminado, id_liberacion, cantidad_despachada
     ) VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.id_despacho, data.id_inventario, data.id_liberacion, data.cantidad_despachada]
  );
  return rows[0];
}

export async function reservarUnidadesInventario(idInventario, cantidad, db) {
  const { rows } = await db.query(
    `UPDATE inventario_producto_terminado
     SET unidades_disponibles = unidades_disponibles - $2,
         unidades_reservadas = unidades_reservadas + $2,
         updated_at = NOW()
     WHERE id_inventario = $1
       AND estado <> 'retenido'
       AND unidades_disponibles >= $2
     RETURNING *`,
    [idInventario, cantidad]
  );
  return rows[0] || null;
}

export async function confirmarReservaInventario(idInventario, cantidad, db) {
  const { rows } = await db.query(
    `UPDATE inventario_producto_terminado
     SET unidades_reservadas = unidades_reservadas - $2,
         unidades_despachadas = unidades_despachadas + $2,
         estado = CASE
           WHEN unidades_despachadas + $2 >= unidades_liberadas THEN 'despachado_total'
           ELSE 'despacho_parcial'
         END,
         updated_at = NOW()
     WHERE id_inventario = $1
       AND unidades_reservadas >= $2
     RETURNING *`,
    [idInventario, cantidad]
  );
  return rows[0] || null;
}

export async function liberarReservaInventario(idInventario, cantidad, db) {
  const { rows } = await db.query(
    `UPDATE inventario_producto_terminado
     SET unidades_reservadas = unidades_reservadas - $2,
         unidades_disponibles = unidades_disponibles + $2,
         estado = CASE WHEN unidades_despachadas > 0 THEN 'despacho_parcial' ELSE 'disponible' END,
         updated_at = NOW()
     WHERE id_inventario = $1
       AND unidades_reservadas >= $2
     RETURNING *`,
    [idInventario, cantidad]
  );
  return rows[0] || null;
}

export async function actualizarDespacho(id, estado, { motivo = null, temperaturaEntrega = null, fechaEntrega = null } = {}, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE despachos
     SET estado_despacho = $2,
         motivo_bloqueo = $3,
         temperatura_entrega_c = COALESCE($4, temperatura_entrega_c),
         fecha_entrega = COALESCE($5, fecha_entrega),
         updated_at = NOW()
     WHERE id_despacho = $1
     RETURNING *`,
    [id, estado, motivo, temperaturaEntrega, fechaEntrega]
  );
  return rows[0] || null;
}

export async function actualizarEstadoAlmacenamientoDesdeInventario(idInventario, estado, db) {
  const { rows } = await db.query(
    `UPDATE almacenamientos_lote al
     SET estado = $2, updated_at = NOW()
     FROM inventario_producto_terminado ipt
     JOIN liberacion_producto lp ON lp.id_liberacion = ipt.id_liberacion
     WHERE ipt.id_inventario = $1
       AND al.id_manufactura = lp.id_manufactura
     RETURNING al.*`,
    [idInventario, estado]
  );
  return rows[0] || null;
}

export async function listarDetallesDespacho(idDespacho, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT dd.*, ipt.lote, ipt.producto
     FROM despacho_detalle dd
     JOIN inventario_producto_terminado ipt ON ipt.id_inventario = dd.id_inventario_producto_terminado
     WHERE dd.id_despacho = $1
     ORDER BY dd.id_detalle`,
    [idDespacho]
  );
  return rows;
}

export async function crearConfirmacionEntrega(data, db = poolPostgres) {
  const { rows } = await db.query(
    `INSERT INTO confirmaciones_entrega (
       id_despacho, receptor, fecha_recepcion, temperatura_entrega_c, observaciones
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.id_despacho, data.receptor, data.fecha_recepcion, data.temperatura_entrega_c, data.observaciones || '']
  );
  return rows[0];
}

export async function buscarConfirmacionPorDespacho(idDespacho, db = poolPostgres, bloquear = false) {
  const { rows } = await db.query(
    `SELECT * FROM confirmaciones_entrega WHERE id_despacho = $1${bloquear ? ' FOR UPDATE' : ''}`,
    [idDespacho]
  );
  return rows[0] || null;
}

export async function actualizarConfirmacion(idConfirmacion, estado, motivo = null, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE confirmaciones_entrega
     SET estado_confirmacion = $2, motivo_bloqueo = $3, updated_at = NOW()
     WHERE id_confirmacion = $1
     RETURNING *`,
    [idConfirmacion, estado, motivo]
  );
  return rows[0] || null;
}

export async function registrarEventoTrazabilidadDespacho(data, db) {
  await db.query(
    `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
     VALUES (NULL, $1, $2, $3, $4)`,
    [data.lote, data.tipo_evento, data.actor, JSON.stringify(data.payload || {})]
  );
}

export async function ejecutarTransaccionDespacho(callback) {
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
