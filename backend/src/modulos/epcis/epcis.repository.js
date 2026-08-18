import { poolPostgres } from '../../configuracion/postgresql.js';

export async function consultarEventosEpcisPorLote(lote, db = poolPostgres) {
  const { rows: identificadores } = await db.query('SELECT * FROM epcis_identificadores_lote WHERE lote=$1', [lote]);
  const maestro = identificadores[0];
  const { rows } = await db.query(`
    SELECT 'recepcion' tipo, r.id id, r.fecha_recepcion event_time FROM receptions r WHERE r.numero_lote=$1 OR r.lote_proveedor=$1
    UNION ALL SELECT 'manufactura', rm.id_manufactura, rm.hora_fin FROM registro_manufactura rm WHERE rm.lote_producido=$1
    UNION ALL SELECT 'envasado', oe.id_envasado, oe.fecha_operacion FROM operaciones_envasado oe WHERE oe.lote=$1
    UNION ALL SELECT 'almacenamiento', al.id_almacenamiento, al.fecha_ingreso FROM almacenamientos_lote al WHERE al.lote_producido=$1
    UNION ALL SELECT 'calidad', c.id_control, c.fecha_control FROM controles_calidad_lote c WHERE c.lote=$1
    UNION ALL SELECT 'liberacion', lp.id_liberacion, lp.fecha_liberacion FROM liberacion_producto lp WHERE lp.lote_producido=$1
    UNION ALL SELECT 'despacho', d.id_despacho, d.fecha_despacho FROM despachos d JOIN despacho_detalle dd ON dd.id_despacho=d.id_despacho JOIN inventario_producto_terminado i ON i.id_inventario=dd.id_inventario_producto_terminado WHERE i.lote=$1
    UNION ALL SELECT 'devolucion', dc.id_caso, dc.fecha_registro FROM devoluciones_no_conformidades dc WHERE dc.lote=$1
    ORDER BY event_time`, [lote]);
  let entradas = [];
  if (rows.some((row) => row.tipo === 'manufactura')) {
    const { rows: materias } = await db.query(`SELECT DISTINCT ei.epc_class_uri FROM registro_manufactura rm JOIN ordenes_produccion_materias opm ON opm.orden_produccion_id=rm.id_orden_produccion JOIN receptions r ON r.id=opm.recepcion_id JOIN epcis_identificadores_lote ei ON ei.lote IN (r.numero_lote,r.lote_proveedor) WHERE rm.lote_producido=$1`, [lote]);
    entradas = materias.map((item) => item.epc_class_uri);
  }
  return rows.map((row) => ({ ...row, epcClassUri: maestro?.epc_class_uri, readPointUri: maestro?.read_point_uri, bizLocationUri: maestro?.biz_location_uri, inputEpcClassUris: row.tipo === 'manufactura' ? entradas : undefined }));
}

export async function auditarInteroperabilidad({ direccion, actor, cantidadEventos, resultado, codigoError = null, metadatos = {} }, db = poolPostgres) {
  await db.query('INSERT INTO auditoria_interoperabilidad(direccion,actor,cantidad_eventos,resultado,codigo_error,metadatos) VALUES($1,$2,$3,$4,$5,$6)', [direccion, actor, cantidadEventos, resultado, codigoError, metadatos]);
}
