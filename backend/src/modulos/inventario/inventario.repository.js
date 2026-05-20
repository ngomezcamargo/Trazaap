import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarInventarioInsumos() {
  const query = `
    SELECT
      i.id AS id_inventario,
      i.materia_prima_id AS id_materia_prima,
      rm.nombre AS materia_prima,
      i.cantidad_disponible,
      i.unidad_medida,
      i.fecha_actualizacion
    FROM inventario_materias_primas i
    JOIN raw_materials rm ON rm.id = i.materia_prima_id
    ORDER BY rm.nombre ASC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}

export async function listarInventarioProductoTerminado() {
  const query = `
    SELECT
      id_inventario,
      id_liberacion,
      producto,
      lote,
      unidades_disponibles,
      fecha_vencimiento,
      estado,
      updated_at
    FROM inventario_producto_terminado
    ORDER BY updated_at DESC, producto ASC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}

export async function listarMovimientosInventario(limite = 10) {
  const query = `
    SELECT
      im.id,
      im.tipo_movimiento,
      im.cantidad,
      im.unidad_medida,
      im.referencia_tipo,
      im.referencia_id,
      im.observaciones,
      im.creado_por,
      im.creado_en,
      rm.nombre AS materia_prima,
      p.nombre AS proveedor,
      COALESCE(r.numero_lote, r.lote_proveedor, rg.lote_producido) AS lote,
      COALESCE(op.codigo_orden, opm.codigo_orden) AS codigo_orden,
      rg.lote_producido,
      COALESCE(usuario_id.email, usuario_email.email, im.creado_por) AS responsable
    FROM inventario_movimientos im
    JOIN raw_materials rm ON rm.id = im.materia_prima_id
    LEFT JOIN receptions r
      ON im.referencia_tipo = 'recepcion'
     AND r.id = im.referencia_id
    LEFT JOIN providers p ON p.id = r.proveedor_id
    LEFT JOIN ordenes_produccion op
      ON im.referencia_tipo = 'orden_produccion'
     AND op.id = im.referencia_id
    LEFT JOIN registro_manufactura rg
      ON im.referencia_tipo = 'registro_manufactura'
     AND rg.id_manufactura = im.referencia_id
    LEFT JOIN ordenes_produccion opm ON opm.id = rg.id_orden_produccion
    LEFT JOIN users usuario_id ON usuario_id.id = CASE
      WHEN im.creado_por ~ '^[0-9]+$' THEN im.creado_por::BIGINT
      ELSE NULL
    END
    LEFT JOIN users usuario_email ON usuario_email.email = im.creado_por
    ORDER BY im.creado_en DESC, im.id DESC
    LIMIT $1
  `;

  const { rows } = await poolPostgres.query(query, [limite]);
  return rows;
}
