import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarCasos(lote = '') {
  const { rows } = await poolPostgres.query(`
    SELECT dnc.*, ipt.producto, c.nombre_razon_social AS cliente,
           d.codigo_despacho, u.email AS responsable_email, creador.email AS creado_por_email
    FROM devoluciones_no_conformidades dnc
    JOIN inventario_producto_terminado ipt ON ipt.id_inventario = dnc.id_inventario
    LEFT JOIN clientes c ON c.id_cliente = dnc.id_cliente
    LEFT JOIN despachos d ON d.id_despacho = dnc.id_despacho
    JOIN users u ON u.id = dnc.responsable
    JOIN users creador ON creador.id = dnc.creado_por
    WHERE ($1 = '' OR dnc.lote = $1)
    ORDER BY dnc.fecha_registro DESC, dnc.id_caso DESC`, [lote]);
  return rows;
}

export async function buscarContextoLote(lote) {
  const { rows } = await poolPostgres.query(`
    SELECT ipt.id_inventario, ipt.lote, ipt.producto, ipt.unidades_liberadas,
           ipt.unidades_despachadas, ipt.unidades_disponibles
    FROM inventario_producto_terminado ipt WHERE ipt.lote = $1`, [lote]);
  return rows[0] || null;
}

export async function buscarDetalleDespachado(idDespacho, lote) {
  const { rows } = await poolPostgres.query(`
    SELECT d.id_despacho, d.id_cliente, d.estado_despacho, dd.cantidad_despachada,
           ipt.id_inventario, ipt.lote
    FROM despachos d JOIN despacho_detalle dd ON dd.id_despacho = d.id_despacho
    JOIN inventario_producto_terminado ipt ON ipt.id_inventario = dd.id_inventario_producto_terminado
    WHERE d.id_despacho = $1 AND ipt.lote = $2`, [idDespacho, lote]);
  return rows[0] || null;
}

export async function crearCaso(data) {
  const { rows } = await poolPostgres.query(`
    INSERT INTO devoluciones_no_conformidades (
      tipo_caso, lote, id_inventario, id_cliente, id_despacho, cantidad,
      fecha_registro, motivo, accion, fecha_decision, responsable,
      observaciones, impacto_inventario, creado_por
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`, [
      data.tipo_caso, data.lote, data.id_inventario, data.id_cliente || null,
      data.id_despacho || null, data.cantidad, data.fecha_registro, data.motivo,
      data.accion, data.fecha_decision || null, data.responsable, data.observaciones,
      data.impacto_inventario, data.creado_por
    ]);
  return rows[0];
}
