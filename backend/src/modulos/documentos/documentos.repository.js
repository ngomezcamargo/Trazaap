import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarDocumentos({ incluirAnulados = false } = {}, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT d.*,
            u.email AS cargado_por_email, au.email AS anulado_por_email,
            CASE WHEN d.fecha_vencimiento IS NOT NULL AND d.fecha_vencimiento < CURRENT_DATE
              THEN 'vencido' ELSE 'vigente' END AS vigencia
     FROM documentos_inocuidad d
     JOIN users u ON u.id = d.cargado_por
     LEFT JOIN users au ON au.id = d.anulado_por
       WHERE ($1::BOOLEAN OR d.estado = 'activo')
     ORDER BY d.created_at DESC`,
    [Boolean(incluirAnulados)]
  );
  return rows;
}

export async function crearDocumento(d, db = poolPostgres) {
  const { rows } = await db.query(
    `INSERT INTO documentos_inocuidad(
       tipo_documental, entidad_emisora, numero_documento, nombre_original,
       objeto_minio, bucket, mime_type, tamano_bytes, fecha_emision,
       fecha_vencimiento, observaciones, cargado_por
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [d.tipo_documental, d.entidad_emisora, d.numero_documento || null, d.nombre_original,
      d.objeto_minio, d.bucket, d.mime_type, d.tamano_bytes,
      d.fecha_emision || null, d.fecha_vencimiento || null, d.observaciones,
      d.cargado_por]
  );
  return rows[0];
}

export async function buscarDocumento(id, db = poolPostgres) {
  const { rows } = await db.query(
    `SELECT * FROM documentos_inocuidad
     WHERE id_documento = $1 AND estado = 'activo'`,
    [id]
  );
  return rows[0] || null;
}

export async function anularDocumento(id, usuarioId, db = poolPostgres) {
  const { rows } = await db.query(
    `UPDATE documentos_inocuidad
     SET estado = 'anulado', anulado_por = $2, anulado_en = NOW(), updated_at = NOW()
     WHERE id_documento = $1 AND estado = 'activo'
     RETURNING *`,
    [id, usuarioId]
  );
  return rows[0] || null;
}
