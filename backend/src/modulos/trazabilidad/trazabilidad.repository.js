import { poolPostgres } from '../../configuracion/postgresql.js';

export async function buscarTrazabilidadRecepcionPorLote(lote) {
  const { rows } = await poolPostgres.query(
    `SELECT
      r.id AS recepcion_id, r.fecha_recepcion, r.lote_proveedor, r.numero_lote,
      r.estado_recepcion, r.cantidad, r.unidad_presentacion, r.unidad_medida,
      r.presentacion, r.fecha_vencimiento, r.recibido_por,
      r.temperatura_recepcion, r.peso_recibido, r.observaciones AS recepcion_observaciones,
      p.id AS proveedor_id, p.nombre AS proveedor_nombre, p.nit AS proveedor_nit,
      rm.id AS materia_prima_id, rm.nombre AS materia_prima,
      i.id AS inspeccion_id, i.olor, i.color, i.textura, i.estado_empaque,
      i.certificado_calidad,
      i.inspeccion_transporte,
      i.condiciones_vehiculo,
      i.higiene_conductor,
      i.observaciones AS inspeccion_observaciones,
      i.observaciones_producto,
      i.observaciones_transporte,
      i.inspeccionado_por,
      i.decision_final, i.inspeccionado_en
     FROM receptions r
     JOIN providers p ON p.id = r.proveedor_id
     JOIN raw_materials rm ON rm.id = r.materia_prima_id
     LEFT JOIN reception_inspections i ON i.reception_id = r.id
     WHERE r.lote_proveedor = $1 OR r.numero_lote = $1
     ORDER BY r.id DESC LIMIT 1`,
    [lote]
  );
  return rows[0] || null;
}

export async function buscarOrdenPorLoteFinalOLoteRecepcion(lote) {
  const { rows } = await poolPostgres.query(
    `SELECT DISTINCT op.*
     FROM ordenes_produccion op
     LEFT JOIN registro_manufactura rm ON rm.id_orden_produccion = op.id
     LEFT JOIN ordenes_produccion_materias opm ON opm.orden_produccion_id = op.id
     LEFT JOIN receptions r ON r.id = opm.recepcion_id
     WHERE rm.lote_producido = $1 OR r.lote_proveedor = $1 OR r.numero_lote = $1
     ORDER BY op.id DESC
     LIMIT 1`,
    [lote]
  );
  return rows[0] || null;
}

export async function obtenerDetalleProduccion(ordenId, lote = '') {
  const [
    productosRes,
    materiasRes,
    tiemposRes,
    manufacturaRes,
    liberacionRes,
    inventarioTerminadoRes,
    movimientosInventarioRes,
    inventariosMateriaPrimaRes
  ] = await Promise.all([
    poolPostgres.query('SELECT * FROM ordenes_produccion_productos WHERE orden_produccion_id = $1 ORDER BY id', [ordenId]),
    poolPostgres.query(
      `SELECT
         opm.*,
         r.id AS recepcion_id,
         r.fecha_recepcion,
         r.lote_proveedor,
         r.numero_lote,
         r.estado_recepcion,
         r.cantidad AS recepcion_cantidad,
         r.unidad_presentacion,
         r.unidad_medida,
         r.presentacion,
         r.fecha_vencimiento,
         r.recibido_por,
         r.temperatura_recepcion,
         r.peso_recibido,
         r.observaciones AS recepcion_observaciones,
         p.id AS proveedor_id,
         p.nombre AS proveedor_nombre,
         p.nit AS proveedor_nit,
         rm.id AS materia_prima_id,
         rm.nombre AS materia_prima,
         i.id AS inspeccion_id,
         i.olor,
         i.color,
         i.textura,
         i.estado_empaque,
         i.certificado_calidad,
         i.inspeccion_transporte,
         i.condiciones_vehiculo,
         i.higiene_conductor,
         i.observaciones AS inspeccion_observaciones,
         i.observaciones_producto,
         i.observaciones_transporte,
         i.inspeccionado_por,
         i.decision_final,
         i.inspeccionado_en
       FROM ordenes_produccion_materias opm
       JOIN receptions r ON r.id = opm.recepcion_id
       JOIN providers p ON p.id = r.proveedor_id
       JOIN raw_materials rm ON rm.id = r.materia_prima_id
       LEFT JOIN reception_inspections i ON i.reception_id = r.id
       WHERE opm.orden_produccion_id = $1
       ORDER BY opm.id`,
      [ordenId]
    ),
    poolPostgres.query('SELECT * FROM tiempos_produccion WHERE orden_produccion_id = $1 ORDER BY id', [ordenId]),
    poolPostgres.query(
      `SELECT rm.*, rm.lote_producido AS lote_producto, rm.unidades_producidas AS peso_total, op.fecha_produccion
       FROM registro_manufactura rm
       JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
       WHERE rm.id_orden_produccion = $1
       ORDER BY CASE WHEN rm.lote_producido = $2 THEN 0 ELSE 1 END, rm.id_manufactura
       LIMIT 1`,
      [ordenId, lote]
    ),
    poolPostgres.query(
      `SELECT lp.*, rm.lote_producido AS lote_producto
       FROM liberacion_producto lp
       JOIN registro_manufactura rm ON rm.id_manufactura = lp.id_manufactura
       WHERE rm.id_orden_produccion = $1
       LIMIT 1`,
      [ordenId]
    ),
    poolPostgres.query(
      `SELECT ipt.*
       FROM inventario_producto_terminado ipt
       JOIN liberacion_producto lp ON lp.id_liberacion = ipt.id_liberacion
       JOIN registro_manufactura rm ON rm.id_manufactura = lp.id_manufactura
       WHERE rm.id_orden_produccion = $1
       ORDER BY ipt.id_inventario
       LIMIT 1`,
      [ordenId]
    ),
    poolPostgres.query(
      `SELECT im.*, rm.nombre AS materia_prima
       FROM inventario_movimientos im
       JOIN raw_materials rm ON rm.id = im.materia_prima_id
       WHERE (
           im.referencia_tipo = 'registro_manufactura'
           AND im.referencia_id IN (
             SELECT id_manufactura FROM registro_manufactura WHERE id_orden_produccion = $1
           )
         )
         OR (
           im.referencia_tipo = 'recepcion'
           AND im.referencia_id IN (
             SELECT recepcion_id FROM ordenes_produccion_materias WHERE orden_produccion_id = $1
           )
         )
       ORDER BY im.creado_en, im.id`,
      [ordenId]
    ),
    poolPostgres.query(
      `SELECT DISTINCT imp.*, rm.nombre AS materia_prima
       FROM inventario_materias_primas imp
       JOIN raw_materials rm ON rm.id = imp.materia_prima_id
       WHERE imp.materia_prima_id IN (
         SELECT DISTINCT r.materia_prima_id
         FROM ordenes_produccion_materias opm
         JOIN receptions r ON r.id = opm.recepcion_id
         WHERE opm.orden_produccion_id = $1
       )
       ORDER BY rm.nombre`,
      [ordenId]
    )
  ]);

  return {
    productos: productosRes.rows,
    materias: materiasRes.rows,
    tiempos: tiemposRes.rows,
    manufactura: manufacturaRes.rows[0] || null,
    liberacion: liberacionRes.rows[0] || null,
    inventarioProductoTerminado: inventarioTerminadoRes.rows[0] || null,
    movimientosInventario: movimientosInventarioRes.rows,
    inventariosMateriaPrima: inventariosMateriaPrimaRes.rows
  };
}

export async function listarEventosPorLote(lote) {
  const { rows } = await poolPostgres.query(
    `SELECT id, tipo_evento, actor, payload, creado_en
     FROM trazabilidad_eventos
     WHERE lote = $1
     ORDER BY creado_en DESC
     LIMIT 50`,
    [lote]
  );
  return rows;
}
