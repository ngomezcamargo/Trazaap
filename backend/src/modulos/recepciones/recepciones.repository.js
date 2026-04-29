import { poolPostgres } from '../../configuracion/postgresql.js';

export async function crearRecepcion(data) {
  const query = `
    INSERT INTO receptions (
      fecha_recepcion,
      proveedor_id,
      materia_prima_id,
      cantidad,
      unidad_presentacion,
      lote_proveedor,
      fecha_vencimiento,
      temperatura_recepcion,
      peso_recibido,
      observaciones,
      recibido_por,
      estado_recepcion
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `;

  const values = [
    data.fecha_recepcion,
    data.proveedor_id,
    data.materia_prima_id,
    data.cantidad,
    data.unidad_presentacion,
    data.lote_proveedor,
    data.fecha_vencimiento,
    data.temperatura_recepcion,
    data.peso_recibido,
    data.observaciones,
    data.recibido_por,
    data.estado_recepcion
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0];
}

export async function listarRecepciones() {
  const query = `
    SELECT r.*, p.nombre AS proveedor_nombre, rm.nombre AS materia_prima_nombre
    FROM receptions r
    JOIN providers p ON p.id = r.proveedor_id
    JOIN raw_materials rm ON rm.id = r.materia_prima_id
    ORDER BY r.id DESC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}

export async function buscarRecepcionPorId(id) {
  const { rows } = await poolPostgres.query('SELECT * FROM receptions WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function buscarContextoRecepcionBlockchain(id) {
  const query = `
    SELECT
      r.id,
      r.fecha_recepcion,
      r.lote_proveedor,
      r.fecha_vencimiento,
      r.cantidad,
      r.unidad_presentacion,
      r.temperatura_recepcion,
      r.peso_recibido,
      r.estado_recepcion,
      p.nombre AS proveedor_nombre,
      rm.nombre AS materia_prima_nombre
    FROM receptions r
    JOIN providers p ON p.id = r.proveedor_id
    JOIN raw_materials rm ON rm.id = r.materia_prima_id
    WHERE r.id = $1
  `;

  const { rows } = await poolPostgres.query(query, [id]);
  return rows[0] || null;
}

export async function crearInspeccion(recepcionId, data) {
  const query = `
    INSERT INTO reception_inspections (
      reception_id,
      olor,
      color,
      textura,
      estado_empaque,
      certificado_calidad,
      inspeccion_vehiculo,
      observaciones,
      decision_final,
      inspeccionado_por
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `;

  const values = [
    recepcionId,
    data.olor,
    data.color,
    data.textura,
    data.estado_empaque,
    data.certificado_calidad,
    data.inspeccion_vehiculo,
    data.observaciones,
    data.decision_final,
    data.inspeccionado_por
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0];
}

export async function listarMateriasPrimas() {
  const { rows } = await poolPostgres.query(
    'SELECT * FROM raw_materials WHERE is_active = true ORDER BY nombre'
  );

  return rows;
}

export async function registrarEventoTrazabilidad(data) {
  const query = `
    INSERT INTO trazabilidad_eventos (
      recepcion_id,
      lote,
      tipo_evento,
      actor,
      payload
    ) VALUES ($1, $2, $3, $4, $5)
  `;

  await poolPostgres.query(query, [
    data.recepcion_id,
    data.lote,
    data.tipo_evento,
    data.actor,
    JSON.stringify(data.payload || {})
  ]);
}
