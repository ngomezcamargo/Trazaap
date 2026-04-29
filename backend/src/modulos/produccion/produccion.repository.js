import { poolPostgres } from '../../configuracion/postgresql.js';

export async function crearOrdenProduccionCabecera(data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO ordenes_produccion (fecha_produccion, codigo_orden, responsable_produccion, estado, observaciones, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.fecha_produccion,
      data.codigo_orden,
      data.responsable_produccion,
      data.estado,
      data.observaciones,
      data.creado_por
    ]
  );
  return rows[0];
}

export async function crearOrdenProducto(ordenId, producto) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO ordenes_produccion_productos (
      orden_produccion_id, producto, codigo_producto, tamano_presentacion,
      cantidad_programada, cantidad_real_producida, unidad_medida, lote_producto_terminado
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      ordenId,
      producto.producto,
      producto.codigo_producto || null,
      producto.tamano_presentacion,
      producto.cantidad_programada,
      producto.cantidad_real_producida,
      producto.unidad_medida,
      producto.lote_producto_terminado || null
    ]
  );
  return rows[0];
}

export async function crearLoteTerminado(ordenId, loteProducto, pesoTotal, fechaProduccion) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO lotes_producto_terminado (orden_produccion_id, lote_producto, peso_total, fecha_produccion)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (orden_produccion_id) DO UPDATE SET
      lote_producto = EXCLUDED.lote_producto,
      peso_total = EXCLUDED.peso_total,
      fecha_produccion = EXCLUDED.fecha_produccion
     RETURNING *`,
    [ordenId, loteProducto, pesoTotal, fechaProduccion]
  );
  return rows[0];
}

export async function listarOrdenesProduccion() {
  const { rows } = await poolPostgres.query('SELECT * FROM ordenes_produccion ORDER BY id DESC');
  return rows;
}

export async function buscarOrdenPorId(id) {
  const { rows } = await poolPostgres.query('SELECT * FROM ordenes_produccion WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function buscarProductosOrden(ordenId) {
  const { rows } = await poolPostgres.query('SELECT * FROM ordenes_produccion_productos WHERE orden_produccion_id = $1', [ordenId]);
  return rows;
}

export async function listarRecepcionesAceptadas() {
  const { rows } = await poolPostgres.query(
    `SELECT r.id, r.lote_proveedor, r.cantidad, r.unidad_presentacion, rm.nombre AS materia_prima
     FROM receptions r
     JOIN raw_materials rm ON rm.id = r.materia_prima_id
     WHERE r.estado_recepcion = 'aceptado'
     ORDER BY r.id DESC`
  );
  return rows;
}

export async function asociarMateriaPrimaOrden(ordenId, materia) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO ordenes_produccion_materias (
      orden_produccion_id, orden_producto_id, recepcion_id, nombre_ingrediente,
      cantidad_planificada, cantidad_real, unidad_medida, observaciones
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      ordenId,
      materia.orden_producto_id,
      materia.recepcion_id,
      materia.nombre_ingrediente,
      materia.cantidad_planificada,
      materia.cantidad_real,
      materia.unidad_medida || 'gramos',
      materia.observaciones || ''
    ]
  );
  return rows[0];
}

export async function crearMoje(ordenId, moje) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO ordenes_produccion_mojes (orden_produccion_id, producto_receta, cantidad_total_moje_gramos)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [ordenId, moje.producto_receta, moje.cantidad_total_moje_gramos]
  );
  return rows[0];
}

export async function crearIngredienteMoje(mojeId, ingrediente) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO ordenes_produccion_mojes_ingredientes (moje_id, recepcion_id, ingrediente, lote_ingrediente, cantidad_gramos)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [mojeId, ingrediente.recepcion_id, ingrediente.ingrediente, ingrediente.lote_ingrediente, ingrediente.cantidad_gramos]
  );
  return rows[0];
}

export async function registrarTiempoProduccion(ordenId, item) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO tiempos_produccion (
      orden_produccion_id, numero_carro_escabiladero, producto, es_bagel,
      unidades_producidas, temperatura_crecimiento, tiempo_crecimiento_min,
      temperatura_inmersion_agua, tiempo_inmersion_agua_seg,
      temperatura_horneo, tiempo_horneo_min, lote_producto,
      responsable_produccion, observaciones
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      ordenId,
      item.numero_carro_escabiladero,
      item.producto,
      item.es_bagel,
      item.unidades_producidas,
      item.temperatura_crecimiento,
      item.tiempo_crecimiento_min,
      item.temperatura_inmersion_agua ?? null,
      item.tiempo_inmersion_agua_seg ?? null,
      item.temperatura_horneo,
      item.tiempo_horneo_min,
      item.lote_producto,
      item.responsable_produccion,
      item.observaciones || ''
    ]
  );
  return rows[0];
}

export async function buscarRecepcionPorId(recepcionId) {
  const { rows } = await poolPostgres.query('SELECT * FROM receptions WHERE id = $1', [recepcionId]);
  return rows[0] || null;
}

export async function listarMateriasOrden(ordenId) {
  const { rows } = await poolPostgres.query(
    `SELECT opm.*, r.lote_proveedor
     FROM ordenes_produccion_materias opm
     JOIN receptions r ON r.id = opm.recepcion_id
     WHERE opm.orden_produccion_id = $1`,
    [ordenId]
  );
  return rows;
}

export async function listarTiemposOrden(ordenId) {
  const { rows } = await poolPostgres.query('SELECT * FROM tiempos_produccion WHERE orden_produccion_id = $1', [ordenId]);
  return rows;
}

export async function registrarEventoTrazabilidad(data) {
  await poolPostgres.query(
    `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.recepcion_id, data.lote, data.tipo_evento, data.actor, JSON.stringify(data.payload || {})]
  );
}
