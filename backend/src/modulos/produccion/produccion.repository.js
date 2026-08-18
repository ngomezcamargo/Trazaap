import { poolPostgres } from '../../configuracion/postgresql.js';
import { calcularFechaVencimiento, formatearLote } from './lotes.util.js';

async function obtenerColumnasTabla(tableName) {
  const { rows } = await poolPostgres.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map((row) => row.column_name));
}

function tamanoPrincipalProducto(data) {
  return data.tamano_presentacion || data.variantes?.[0]?.tamano_presentacion || 'mediano';
}

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
  const columnas = await obtenerColumnasTabla('productos_fabricados');
  const campos = [
    'nombre',
    'prefijo_lote',
    'categoria',
    'descripcion',
    'vida_util_dias',
    'condiciones_almacenamiento',
    'temperatura_almacenamiento_min_c',
    'temperatura_almacenamiento_max_c',
    'requiere_refrigeracion',
    'estado',
    'requiere_inmersion',
    'tiempo_fermentacion_minutos',
    'temperatura_fermentacion_c',
    'tiempo_horneado_minutos',
    'temperatura_horneado_c',
    'tiempo_inmersion_minutos',
    'temperatura_inmersion_c'
  ];
  const valores = [
    data.nombre,
    data.prefijo_lote,
    data.categoria || '',
    data.descripcion || '',
    data.vida_util_dias,
    data.condiciones_almacenamiento || '',
    data.temperatura_almacenamiento_min_c,
    data.temperatura_almacenamiento_max_c,
    data.requiere_refrigeracion,
    data.estado || 'activo',
    data.requiere_inmersion,
    data.tiempo_fermentacion_minutos,
    data.temperatura_fermentacion_c,
    data.tiempo_horneado_minutos,
    data.temperatura_horneado_c,
    data.requiere_inmersion ? data.tiempo_inmersion_minutos : 0,
    data.requiere_inmersion ? data.temperatura_inmersion_c : 0
  ];

  if (columnas.has('tamano_presentacion')) {
    campos.push('tamano_presentacion');
    valores.push(tamanoPrincipalProducto(data));
  }

  const placeholders = campos.map((_, index) => `$${index + 1}`).join(',');
  const { rows } = await poolPostgres.query(
    `INSERT INTO productos_fabricados (${campos.join(',')})
    VALUES (${placeholders})
    RETURNING *`,
    valores
  );
  return rows[0];
}

export async function actualizarProductoFabricado(id, data) {
  const columnas = await obtenerColumnasTabla('productos_fabricados');
  const campos = [
    'nombre = $1',
    'prefijo_lote = $2',
    'categoria = $3',
    'descripcion = $4',
    'vida_util_dias = $5',
    'condiciones_almacenamiento = $6',
    'temperatura_almacenamiento_min_c = $7',
    'temperatura_almacenamiento_max_c = $8',
    'requiere_refrigeracion = $9',
    'estado = $10',
    'requiere_inmersion = $11',
    'tiempo_fermentacion_minutos = $12',
    'temperatura_fermentacion_c = $13',
    'tiempo_horneado_minutos = $14',
    'temperatura_horneado_c = $15',
    'tiempo_inmersion_minutos = $16',
    'temperatura_inmersion_c = $17'
  ];
  const valores = [
    data.nombre,
    data.prefijo_lote,
    data.categoria || '',
    data.descripcion || '',
    data.vida_util_dias,
    data.condiciones_almacenamiento || '',
    data.temperatura_almacenamiento_min_c,
    data.temperatura_almacenamiento_max_c,
    data.requiere_refrigeracion,
    data.estado || 'activo',
    data.requiere_inmersion,
    data.tiempo_fermentacion_minutos,
    data.temperatura_fermentacion_c,
    data.tiempo_horneado_minutos,
    data.temperatura_horneado_c,
    data.requiere_inmersion ? data.tiempo_inmersion_minutos : 0,
    data.requiere_inmersion ? data.temperatura_inmersion_c : 0
  ];

  if (columnas.has('tamano_presentacion')) {
    valores.push(tamanoPrincipalProducto(data));
    campos.push(`tamano_presentacion = $${valores.length}`);
  }

  if (columnas.has('updated_at')) {
    campos.push('updated_at = NOW()');
  }

  valores.push(id);
  const { rows } = await poolPostgres.query(
    `UPDATE productos_fabricados
     SET ${campos.join(', ')}
     WHERE id = $${valores.length}
     RETURNING *`,
    valores
  );
  return rows[0] || null;
}

export async function generarLoteProducto(ordenId, productoOrdenId, db = poolPostgres) {
  const contexto = await db.query(
    `SELECT to_char(op.fecha_produccion, 'YYYY-MM-DD') AS fecha_produccion, pf.prefijo_lote, pf.vida_util_dias
     FROM ordenes_produccion_productos opp
     JOIN ordenes_produccion op ON op.id = opp.orden_produccion_id
     JOIN productos_fabricados pf ON pf.id = opp.producto_fabricado_id
     WHERE opp.id = $1 AND opp.orden_produccion_id = $2`,
    [productoOrdenId, ordenId]
  );
  const producto = contexto.rows[0];
  if (!producto?.prefijo_lote || !producto?.fecha_produccion) {
    throw new Error('No se pudo determinar el prefijo o la fecha de produccion del producto.');
  }

  const consecutivo = await db.query(
    `INSERT INTO consecutivos_lote (prefijo_producto, fecha_produccion, ultimo_consecutivo)
     VALUES ($1, $2, 1)
     ON CONFLICT (prefijo_producto, fecha_produccion)
     DO UPDATE SET ultimo_consecutivo = consecutivos_lote.ultimo_consecutivo + 1
     RETURNING ultimo_consecutivo`,
    [producto.prefijo_lote, producto.fecha_produccion]
  );
  const numero = consecutivo.rows[0]?.ultimo_consecutivo;
  return {
    lote_producido: formatearLote(producto.prefijo_lote, producto.fecha_produccion, numero),
    fecha_vencimiento_calculada: calcularFechaVencimiento(producto.fecha_produccion, producto.vida_util_dias)
  };
}

export async function reemplazarVariantesProducto(productoId, variantes) {
  const columnas = await obtenerColumnasTabla('producto_variantes');
  await poolPostgres.query('DELETE FROM producto_variantes WHERE producto_id = $1', [productoId]);

  for (const variante of variantes) {
    const campos = ['producto_id', 'tamano_presentacion', 'peso_estimado_unidad', 'unidad_medida', 'estado'];
    const valores = [
      productoId,
      variante.tamano_presentacion,
      variante.peso_estimado_unidad || null,
      variante.unidad_medida || 'unidad',
      variante.estado || 'activo'
    ];

    if (columnas.has('nombre_variante')) {
      campos.push('nombre_variante');
      valores.push(variante.tamano_presentacion);
    }

    const placeholders = campos.map((_, index) => `$${index + 1}`).join(',');
    const { rows } = await poolPostgres.query(
      `INSERT INTO producto_variantes (${campos.join(',')})
      VALUES (${placeholders})
      RETURNING *`,
      valores
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
    `INSERT INTO ordenes_produccion (fecha_produccion, codigo_orden, estado, observaciones, creado_por)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.fecha_produccion,
      data.codigo_orden,
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

  if (columnas.has('estado_manufactura')) {
    campos.push('estado_manufactura');
    valores.push('pendiente');
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
      COALESCE(SUM(rm.unidades_producidas), 0) AS cantidad_total_producida
     FROM ordenes_produccion o
     LEFT JOIN users u ON u.id = o.responsable_produccion
     LEFT JOIN ordenes_produccion_productos p ON p.orden_produccion_id = o.id
     LEFT JOIN registro_manufactura rm ON rm.id_producto = p.id
     GROUP BY o.id, u.email
     ORDER BY o.id DESC`
  );
  return rows;
}

export async function listarOrdenesManufactura() {
  const { rows } = await poolPostgres.query(
    `SELECT o.*, u.email AS responsable_email,
      COALESCE(SUM(p.cantidad_programada), 0) AS cantidad_total_programada,
      COALESCE(SUM(rm.unidades_producidas), 0) AS cantidad_total_producida,
      COUNT(p.id) FILTER (WHERE p.estado_manufactura IN ('pendiente', 'en_proceso')) AS productos_pendientes
     FROM ordenes_produccion o
     LEFT JOIN users u ON u.id = o.responsable_produccion
     LEFT JOIN ordenes_produccion_productos p ON p.orden_produccion_id = o.id
     LEFT JOIN registro_manufactura rm ON rm.id_producto = p.id
     WHERE o.estado IN ('pendiente', 'en_proceso')
     GROUP BY o.id, u.email
     ORDER BY o.fecha_produccion ASC, o.id ASC`
  );
  return rows;
}

export async function buscarOrdenPorId(id) {
  const { rows } = await poolPostgres.query('SELECT * FROM ordenes_produccion WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function buscarProductosOrden(ordenId) {
  const { rows } = await poolPostgres.query(
    `SELECT op.*,
       pf.requiere_inmersion,
       pf.tiempo_fermentacion_minutos,
       pf.temperatura_fermentacion_c,
       pf.tiempo_horneado_minutos,
       pf.temperatura_horneado_c,
       pf.tiempo_inmersion_minutos,
       pf.temperatura_inmersion_c,
       rm.id_manufactura,
       rm.lote_producido,
       rm.fecha_vencimiento_calculada,
       rm.unidades_producidas,
       rm.tiempo_real_fermentacion_minutos,
       rm.temperatura_real_fermentacion_c,
       rm.tiempo_real_horneado_minutos,
       rm.temperatura_real_horneado_c,
       rm.tiempo_real_inmersion_minutos,
       rm.temperatura_real_inmersion_c,
       rm.hora_inicio,
       rm.hora_fin,
       rm.observaciones AS manufactura_observaciones,
       rm.registrado_por_usuario_id,
       rm.registrado_por,
       rm.created_at AS manufactura_created_at
     FROM ordenes_produccion_productos op
     LEFT JOIN productos_fabricados pf ON pf.id = op.producto_fabricado_id
     LEFT JOIN registro_manufactura rm ON rm.id_producto = op.id
     LEFT JOIN producto_variantes v ON v.id = op.producto_variante_id
     WHERE op.orden_produccion_id = $1
     ORDER BY op.id ASC`,
    [ordenId]
  );
  return rows;
}

export async function buscarProductoOrdenPorId(ordenId, productoOrdenId) {
  const { rows } = await poolPostgres.query(
    `SELECT op.*,
       pf.requiere_inmersion,
       pf.tiempo_fermentacion_minutos,
       pf.temperatura_fermentacion_c,
       pf.tiempo_horneado_minutos,
       pf.temperatura_horneado_c,
       pf.tiempo_inmersion_minutos,
       pf.temperatura_inmersion_c,
       rm.id_manufactura
     FROM ordenes_produccion_productos op
     LEFT JOIN productos_fabricados pf ON pf.id = op.producto_fabricado_id
     LEFT JOIN registro_manufactura rm ON rm.id_producto = op.id
     WHERE op.id = $1 AND op.orden_produccion_id = $2`,
    [productoOrdenId, ordenId]
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

export async function buscarMateriasPorProductoOrdenId(ordenId, productoOrdenId, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT m.*,
       r.materia_prima_id,
       r.lote_proveedor,
       r.numero_lote,
       r.unidad_medida AS unidad_recepcion,
       i.cantidad_disponible AS inventario_disponible
     FROM ordenes_produccion_materias m
     JOIN receptions r ON r.id = m.recepcion_id
     LEFT JOIN inventario_materias_primas i
       ON i.materia_prima_id = r.materia_prima_id
      AND i.unidad_medida = m.unidad_medida
     WHERE m.orden_produccion_id = $1 AND m.orden_producto_id = $2
     ORDER BY m.id ASC`,
    [ordenId, productoOrdenId]
  );
  return rows;
}

export async function crearRegistroManufactura(data, db = poolPostgres) {
  const { rows } = await db.query(
    `INSERT INTO registro_manufactura (
      id_orden_produccion,
      id_producto,
      lote_producido,
      fecha_vencimiento_calculada,
      unidades_producidas,
      tiempo_real_fermentacion_minutos,
      temperatura_real_fermentacion_c,
      tiempo_real_horneado_minutos,
      temperatura_real_horneado_c,
      tiempo_real_inmersion_minutos,
      temperatura_real_inmersion_c,
      hora_inicio,
      hora_fin,
      observaciones,
      registrado_por_usuario_id,
      registrado_por
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *`,
    [
      data.id_orden_produccion,
      data.id_producto,
      data.lote_producido,
      data.fecha_vencimiento_calculada,
      data.unidades_producidas,
      data.tiempo_real_fermentacion_minutos,
      data.temperatura_real_fermentacion_c,
      data.tiempo_real_horneado_minutos,
      data.temperatura_real_horneado_c,
      data.tiempo_real_inmersion_minutos ?? null,
      data.temperatura_real_inmersion_c ?? null,
      data.hora_inicio,
      data.hora_fin,
      data.observaciones || '',
      data.registrado_por_usuario_id || null,
      data.registrado_por
    ]
  );
  return rows[0];
}

export async function actualizarEstadoManufacturaProducto(productoOrdenId, estado, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE ordenes_produccion_productos
     SET estado_manufactura = $2
     WHERE id = $1
     RETURNING *`,
    [productoOrdenId, estado]
  );
  return rows[0] || null;
}

export async function contarProductosPendientesManufactura(ordenId, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS pendientes
     FROM ordenes_produccion_productos
     WHERE orden_produccion_id = $1
       AND estado_manufactura NOT IN ('registrado', 'con_observaciones')`,
    [ordenId]
  );
  return rows[0]?.pendientes || 0;
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

export async function actualizarEstadoOrden(ordenId, estado, db = poolPostgres) {
  const { rows } = await db.query(
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

export async function descontarInventarioMateria(data, db = poolPostgres) {
  const referenciaTipo = data.referencia_tipo || 'orden_produccion';
  const referenciaId = data.referencia_id ?? data.orden_produccion_id ?? null;
  const { rows } = await db.query(
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

  const movimientoRes = await db.query(
    `INSERT INTO inventario_movimientos (
      materia_prima_id, tipo_movimiento, cantidad, unidad_medida,
      referencia_tipo, referencia_id, observaciones, creado_por
    ) VALUES ($1, 'salida', $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      data.materia_prima_id,
      data.cantidad,
      data.unidad_medida,
      referenciaTipo,
      referenciaId,
      data.observaciones || '',
      data.actor || null
    ]
  );

  return { ...rows[0], movimiento_id: movimientoRes.rows[0]?.id || null };
}

export async function devolverInventarioMateria(data, db = poolPostgres) {
  const referenciaTipo = data.referencia_tipo || 'orden_produccion';
  const referenciaId = data.referencia_id ?? data.orden_produccion_id ?? null;
  const { rows } = await db.query(
    `INSERT INTO inventario_materias_primas (materia_prima_id, cantidad_disponible, unidad_medida, fecha_actualizacion)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (materia_prima_id)
     DO UPDATE SET
       cantidad_disponible = inventario_materias_primas.cantidad_disponible + EXCLUDED.cantidad_disponible,
       fecha_actualizacion = NOW()
     RETURNING *`,
    [data.materia_prima_id, data.cantidad, data.unidad_medida]
  );

  const movimientoRes = await db.query(
    `INSERT INTO inventario_movimientos (
      materia_prima_id, tipo_movimiento, cantidad, unidad_medida,
      referencia_tipo, referencia_id, observaciones, creado_por
    ) VALUES ($1, 'ajuste', $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      data.materia_prima_id,
      data.cantidad,
      data.unidad_medida,
      referenciaTipo,
      referenciaId,
      data.observaciones || '',
      data.actor || null
    ]
  );

  return { ...rows[0], movimiento_id: movimientoRes.rows[0]?.id || null };
}

export async function buscarMovimientoInventarioMateria(data, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT *
     FROM inventario_movimientos
     WHERE materia_prima_id = $1
       AND tipo_movimiento = $2
       AND referencia_tipo = $3
       AND referencia_id = $4
     LIMIT 1`,
    [data.materia_prima_id, data.tipo_movimiento, data.referencia_tipo, data.referencia_id]
  );
  return rows[0] || null;
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
      orden_produccion_id, producto, es_bagel,
      unidades_producidas, temperatura_crecimiento, tiempo_crecimiento_min,
      temperatura_inmersion_agua, tiempo_inmersion_agua_seg,
      temperatura_horneo, tiempo_horneo_min, lote_producto,
      responsable_produccion, observaciones
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [
      ordenId,
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

export async function registrarEventoTrazabilidad(data, db = poolPostgres) {
  await db.query(
    `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.recepcion_id, data.lote, data.tipo_evento, data.actor, JSON.stringify(data.payload || {})]
  );
}

export async function ejecutarTransaccionProduccion(callback) {
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
