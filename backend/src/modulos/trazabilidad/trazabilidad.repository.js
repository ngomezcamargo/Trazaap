import { poolPostgres } from '../../configuracion/postgresql.js';

export async function buscarTrazabilidadRecepcionPorLote(lote) {
  const { rows } = await poolPostgres.query(
    `SELECT
      r.id AS recepcion_id, r.fecha_recepcion, r.lote_proveedor, r.estado_recepcion, r.cantidad,
      r.unidad_presentacion, r.temperatura_recepcion, r.peso_recibido, r.observaciones AS recepcion_observaciones,
      p.id AS proveedor_id, p.nombre AS proveedor_nombre, p.nit AS proveedor_nit,
      rm.nombre AS materia_prima,
      i.id AS inspeccion_id, i.olor, i.color, i.textura, i.estado_empaque,
      i.certificado_calidad, i.inspeccion_vehiculo, i.observaciones AS inspeccion_observaciones,
      i.decision_final, i.inspeccionado_en
     FROM receptions r
     JOIN providers p ON p.id = r.proveedor_id
     JOIN raw_materials rm ON rm.id = r.materia_prima_id
     LEFT JOIN reception_inspections i ON i.reception_id = r.id
     WHERE r.lote_proveedor = $1
     ORDER BY r.id DESC LIMIT 1`,
    [lote]
  );
  return rows[0] || null;
}

export async function buscarOrdenPorLoteFinalOLoteRecepcion(lote) {
  const { rows } = await poolPostgres.query(
    `SELECT DISTINCT op.*
     FROM ordenes_produccion op
     LEFT JOIN lotes_producto_terminado lpt ON lpt.orden_produccion_id = op.id
     LEFT JOIN ordenes_produccion_materias opm ON opm.orden_produccion_id = op.id
     LEFT JOIN receptions r ON r.id = opm.recepcion_id
     WHERE lpt.lote_producto = $1 OR r.lote_proveedor = $1
     ORDER BY op.id DESC
     LIMIT 1`,
    [lote]
  );
  return rows[0] || null;
}

export async function obtenerDetalleProduccion(ordenId) {
  const [productosRes, materiasRes, tiemposRes, mojesRes, mojesIngRes, loteRes, liberacionRes] = await Promise.all([
    poolPostgres.query('SELECT * FROM ordenes_produccion_productos WHERE orden_produccion_id = $1 ORDER BY id', [ordenId]),
    poolPostgres.query(
      `SELECT opm.*, r.lote_proveedor
       FROM ordenes_produccion_materias opm
       JOIN receptions r ON r.id = opm.recepcion_id
       WHERE opm.orden_produccion_id = $1
       ORDER BY opm.id`,
      [ordenId]
    ),
    poolPostgres.query('SELECT * FROM tiempos_produccion WHERE orden_produccion_id = $1 ORDER BY id', [ordenId]),
    poolPostgres.query('SELECT * FROM ordenes_produccion_mojes WHERE orden_produccion_id = $1 ORDER BY id', [ordenId]),
    poolPostgres.query(
      `SELECT omi.*
       FROM ordenes_produccion_mojes_ingredientes omi
       JOIN ordenes_produccion_mojes om ON om.id = omi.moje_id
       WHERE om.orden_produccion_id = $1
       ORDER BY omi.id`,
      [ordenId]
    ),
    poolPostgres.query('SELECT * FROM lotes_producto_terminado WHERE orden_produccion_id = $1 LIMIT 1', [ordenId]),
    poolPostgres.query(
      `SELECT lp.*, lpt.lote_producto
       FROM liberaciones_producto lp
       JOIN lotes_producto_terminado lpt ON lpt.id = lp.lote_producto_id
       WHERE lpt.orden_produccion_id = $1
       LIMIT 1`,
      [ordenId]
    )
  ]);

  return {
    productos: productosRes.rows,
    materias: materiasRes.rows,
    tiempos: tiemposRes.rows,
    mojes: mojesRes.rows,
    mojesIngredientes: mojesIngRes.rows,
    loteTerminado: loteRes.rows[0] || null,
    liberacion: liberacionRes.rows[0] || null
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
