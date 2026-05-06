import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarProductosFabricados(filtro = '') {
  const query = `
    SELECT p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', v.id,
            'tamano_presentacion', v.tamano_presentacion,
            'peso_estimado_unidad', v.peso_estimado_unidad,
            'unidad_medida', v.unidad_medida,
            'estado', v.estado
          )
          ORDER BY v.id ASC
        ) FILTER (WHERE v.id IS NOT NULL),
        '[]'::json
      ) AS variantes
    FROM productos_fabricados p
    LEFT JOIN producto_variantes v ON v.producto_id = p.id
    WHERE ($1 = '' OR lower(p.nombre) LIKE $2 OR lower(p.categoria) LIKE $2)
    GROUP BY p.id
    ORDER BY p.nombre ASC
  `;
  const f = String(filtro || '').trim().toLowerCase();
  const { rows } = await poolPostgres.query(query, [f, `%${f}%`]);
  return rows;
}

export async function crearProductoFabricado(data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO productos_fabricados (
      nombre, categoria, descripcion,
      vida_util_dias, condiciones_almacenamiento, estado,
      requiere_inmersion,
      tiempo_fermentacion_minutos, temperatura_fermentacion_c,
      tiempo_horneado_minutos, temperatura_horneado_c,
      tiempo_inmersion_minutos, temperatura_inmersion_c
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      data.nombre,
      data.categoria || '',
      data.descripcion || '',
      data.vida_util_dias,
      data.condiciones_almacenamiento || '',
      data.estado || 'activo',
      data.requiere_inmersion,
      data.tiempo_fermentacion_minutos,
      data.temperatura_fermentacion_c,
      data.tiempo_horneado_minutos,
      data.temperatura_horneado_c,
      data.requiere_inmersion ? data.tiempo_inmersion_minutos : 0,
      data.requiere_inmersion ? data.temperatura_inmersion_c : 0
    ]
  );
  return rows[0];
}

export async function actualizarProductoFabricado(id, data) {
  const { rows } = await poolPostgres.query(
    `UPDATE productos_fabricados
     SET nombre = $1,
         categoria = $2,
         descripcion = $3,
         vida_util_dias = $4,
         condiciones_almacenamiento = $5,
         estado = $6,
         requiere_inmersion = $7,
         tiempo_fermentacion_minutos = $8,
         temperatura_fermentacion_c = $9,
         tiempo_horneado_minutos = $10,
         temperatura_horneado_c = $11,
         tiempo_inmersion_minutos = $12,
         temperatura_inmersion_c = $13,
         updated_at = NOW()
     WHERE id = $14
     RETURNING *`,
    [
      data.nombre,
      data.categoria || '',
      data.descripcion || '',
      data.vida_util_dias,
      data.condiciones_almacenamiento || '',
      data.estado || 'activo',
      data.requiere_inmersion,
      data.tiempo_fermentacion_minutos,
      data.temperatura_fermentacion_c,
      data.tiempo_horneado_minutos,
      data.temperatura_horneado_c,
      data.requiere_inmersion ? data.tiempo_inmersion_minutos : 0,
      data.requiere_inmersion ? data.temperatura_inmersion_c : 0,
      id
    ]
  );
  return rows[0] || null;
}

export async function reemplazarVariantesProducto(productoId, variantes) {
  await poolPostgres.query('DELETE FROM producto_variantes WHERE producto_id = $1', [productoId]);

  for (const variante of variantes) {
    const { rows } = await poolPostgres.query(
      `INSERT INTO producto_variantes (
        producto_id, tamano_presentacion, peso_estimado_unidad, unidad_medida, estado
      ) VALUES ($1,$2,$3,$4,$5)
      RETURNING *`,
      [
        productoId,
        variante.tamano_presentacion,
        variante.peso_estimado_unidad || null,
        variante.unidad_medida || 'unidad',
        variante.estado || 'activo'
      ]
    );

    for (const item of variante.receta) {
      await poolPostgres.query(
        `INSERT INTO producto_variante_materia_prima (variante_id, materia_prima_id, cantidad_requerida, observaciones)
         VALUES ($1,$2,$3,$4)`,
        [rows[0].id, item.materia_prima_id, item.cantidad_requerida, item.observaciones || '']
      );
    }
  }
}

export async function buscarProductoFabricadoPorId(id) {
  const { rows } = await poolPostgres.query('SELECT * FROM productos_fabricados WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function listarVariantesProducto(productoId) {
  const { rows } = await poolPostgres.query(
    `SELECT *
     FROM producto_variantes
     WHERE producto_id = $1
     ORDER BY id ASC`,
    [productoId]
  );
  return rows;
}

export async function buscarVarianteProductoPorId(id) {
  const { rows } = await poolPostgres.query(
    `SELECT v.*, p.nombre AS producto_nombre
     FROM producto_variantes v
     JOIN productos_fabricados p ON p.id = v.producto_id
     WHERE v.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function listarRecetaVariante(varianteId) {
  const { rows } = await poolPostgres.query(
    `SELECT pm.*, rm.nombre AS materia_prima, rm.unidad_medida_base, rm.unidad_medida,
      i.cantidad_disponible AS inventario_disponible, i.unidad_medida AS inventario_unidad
     FROM producto_variante_materia_prima pm
     JOIN raw_materials rm ON rm.id = pm.materia_prima_id
     LEFT JOIN inventario_materias_primas i ON i.materia_prima_id = pm.materia_prima_id
     WHERE pm.variante_id = $1
     ORDER BY pm.id ASC`,
    [varianteId]
  );
  return rows;
}

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
  const columnasRes = await poolPostgres.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ordenes_produccion_productos'`
  );
  const columnas = new Set(columnasRes.rows.map((r) => r.column_name));

  const campos = [
    'orden_produccion_id',
    'producto_fabricado_id',
    'producto_variante_id',
    'producto',
    'tamano_presentacion',
    'cantidad_programada'
  ];
  const valores = [
    ordenId,
    producto.producto_id || null,
    producto.variante_id || null,
    producto.producto,
    producto.tamano_presentacion,
    producto.cantidad_programada
  ];

  if (columnas.has('observaciones')) {
    campos.push('observaciones');
    valores.push(producto.observaciones || '');
  }

  const placeholders = campos.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await poolPostgres.query(
    `INSERT INTO ordenes_produccion_productos (${campos.join(',')})
    VALUES (${placeholders})
    RETURNING *`,
    valores
  );
  return rows[0];
}

export async function listarOrdenesProduccion() {
  const { rows } = await poolPostgres.query(
    `SELECT o.*, u.email AS responsable_email,
      COALESCE(SUM(p.cantidad_programada), 0) AS cantidad_total_programada,
      0::numeric AS cantidad_total_producida
     FROM ordenes_produccion o
     LEFT JOIN users u ON u.id = o.responsable_produccion
     LEFT JOIN ordenes_produccion_productos p ON p.orden_produccion_id = o.id
     GROUP BY o.id, u.email
     ORDER BY o.id DESC`
  );
  return rows;
}

export async function buscarOrdenPorId(id) {
  const { rows } = await poolPostgres.query('SELECT * FROM ordenes_produccion WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function buscarProductosOrden(ordenId) {
  const { rows } = await poolPostgres.query(
    `SELECT op.*
     FROM ordenes_produccion_productos op
     LEFT JOIN producto_variantes v ON v.id = op.producto_variante_id
     WHERE op.orden_produccion_id = $1
     ORDER BY op.id ASC`,
    [ordenId]
  );
  return rows;
}

export async function buscarMateriasPorOrdenId(ordenId) {
  const { rows } = await poolPostgres.query(
    `SELECT m.*, r.lote_proveedor, r.numero_lote, r.unidad_medida AS unidad_recepcion
     FROM ordenes_produccion_materias m
     JOIN receptions r ON r.id = m.recepcion_id
     WHERE m.orden_produccion_id = $1
     ORDER BY m.id ASC`,
    [ordenId]
  );
  return rows;
}

export async function buscarTiemposPorOrdenId(ordenId) {
  const { rows } = await poolPostgres.query(
    'SELECT * FROM tiempos_produccion WHERE orden_produccion_id = $1 ORDER BY id DESC',
    [ordenId]
  );
  return rows;
}

export async function actualizarEstadoOrden(ordenId, estado) {
  const { rows } = await poolPostgres.query(
    `UPDATE ordenes_produccion
     SET estado = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [estado, ordenId]
  );
  return rows[0] || null;
}

export async function actualizarCantidadRealMateria(ordenId, materiaId, cantidadReal) {
  const { rows } = await poolPostgres.query(
    `UPDATE ordenes_produccion_materias
     SET cantidad_real = $1
     WHERE id = $2 AND orden_produccion_id = $3
     RETURNING *`,
    [cantidadReal, materiaId, ordenId]
  );
  return rows[0] || null;
}

export async function buscarMateriaOrdenPorId(ordenId, materiaId) {
  const { rows } = await poolPostgres.query(
    `SELECT *
     FROM ordenes_produccion_materias
     WHERE id = $1 AND orden_produccion_id = $2`,
    [materiaId, ordenId]
  );
  return rows[0] || null;
}

export async function crearMateriaPrimaOrdenPlanificada(ordenId, data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO ordenes_produccion_materias (
      orden_produccion_id, orden_producto_id, recepcion_id, nombre_ingrediente,
      cantidad_planificada, cantidad_real, unidad_medida, observaciones
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      ordenId,
      data.orden_producto_id,
      data.recepcion_id,
      data.nombre_ingrediente,
      data.cantidad_planificada,
      data.cantidad_real,
      data.unidad_medida,
      data.observaciones || ''
    ]
  );
  return rows[0];
}

export async function listarRecepcionesAceptadas() {
  const { rows } = await poolPostgres.query(
    `SELECT r.id, r.materia_prima_id, r.lote_proveedor, r.numero_lote, r.cantidad, r.unidad_medida, r.unidad_presentacion, rm.nombre AS materia_prima
     FROM receptions r
     JOIN raw_materials rm ON rm.id = r.materia_prima_id
     WHERE r.estado_recepcion = 'aceptado'
     ORDER BY r.id DESC`
  );
  return rows;
}

export async function descontarInventarioMateria(data) {
  const { rows } = await poolPostgres.query(
    `UPDATE inventario_materias_primas
     SET cantidad_disponible = cantidad_disponible - $2,
         fecha_actualizacion = NOW()
     WHERE materia_prima_id = $1
       AND unidad_medida = $3
       AND cantidad_disponible >= $2
     RETURNING *`,
    [data.materia_prima_id, data.cantidad, data.unidad_medida]
  );

  if (!rows[0]) return null;

  await poolPostgres.query(
    `INSERT INTO inventario_movimientos (
      materia_prima_id, tipo_movimiento, cantidad, unidad_medida,
      referencia_tipo, referencia_id, observaciones, creado_por
    ) VALUES ($1, 'salida', $2, $3, 'orden_produccion', $4, $5, $6)`,
    [
      data.materia_prima_id,
      data.cantidad,
      data.unidad_medida,
      data.orden_produccion_id,
      data.observaciones || '',
      data.actor || null
    ]
  );

  return rows[0];
}

export async function devolverInventarioMateria(data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO inventario_materias_primas (materia_prima_id, cantidad_disponible, unidad_medida, fecha_actualizacion)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (materia_prima_id)
     DO UPDATE SET
       cantidad_disponible = inventario_materias_primas.cantidad_disponible + EXCLUDED.cantidad_disponible,
       fecha_actualizacion = NOW()
     RETURNING *`,
    [data.materia_prima_id, data.cantidad, data.unidad_medida]
  );

  await poolPostgres.query(
    `INSERT INTO inventario_movimientos (
      materia_prima_id, tipo_movimiento, cantidad, unidad_medida,
      referencia_tipo, referencia_id, observaciones, creado_por
    ) VALUES ($1, 'ajuste', $2, $3, 'orden_produccion', $4, $5, $6)`,
    [
      data.materia_prima_id,
      data.cantidad,
      data.unidad_medida,
      data.orden_produccion_id,
      data.observaciones || '',
      data.actor || null
    ]
  );

  return rows[0];
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
