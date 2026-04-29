import { poolPostgres } from '../../configuracion/postgresql.js';

async function obtenerColumnasTabla(client, tableName) {
  const { rows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName]
  );

  return new Set(rows.map((row) => row.column_name));
}

export async function crearRecepcion(data) {
  const client = await poolPostgres.connect();
  try {
    await client.query('BEGIN');

    const columnasRecepciones = await obtenerColumnasTabla(client, 'receptions');
    const columnasInspeccion = await obtenerColumnasTabla(client, 'reception_inspections');

    const tienePresentacion = columnasRecepciones.has('presentacion');
    const tieneNumeroLote = columnasRecepciones.has('numero_lote');
    const tienePesoRecibido = columnasRecepciones.has('peso_recibido');

    const camposRecepcion = [
      'fecha_recepcion',
      'proveedor_id',
      'materia_prima_id',
      'cantidad',
      'unidad_presentacion',
      'lote_proveedor',
      'fecha_vencimiento',
      'temperatura_recepcion',
      'observaciones',
      'recibido_por',
      'estado_recepcion'
    ];

    const values = [
      data.fecha_recepcion || new Date().toISOString(),
      data.proveedor_id,
      data.materia_prima_id,
      data.cantidad,
      data.presentacion,
      data.numero_lote,
      data.fecha_vencimiento,
      data.temperatura,
      data.observaciones,
      data.recibido_por,
      data.estado_recepcion
    ];

    if (tienePesoRecibido) {
      camposRecepcion.push('peso_recibido');
      values.push(data.peso_recibido ?? data.cantidad);
    }

    if (tienePresentacion) {
      camposRecepcion.push('presentacion');
      values.push(data.presentacion);
    }

    if (tieneNumeroLote) {
      camposRecepcion.push('numero_lote');
      values.push(data.numero_lote);
    }

    const placeholders = camposRecepcion.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      INSERT INTO receptions (${camposRecepcion.join(',')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const { rows } = await client.query(query, values);
    const recepcion = rows[0];

    const camposInspeccion = [
      'reception_id',
      'olor',
      'color',
      'textura',
      'estado_empaque',
      'certificado_calidad',
      'inspeccion_vehiculo',
      'observaciones',
      'decision_final',
      'inspeccionado_por'
    ];

    const inspeccionValues = [
      recepcion.id,
      data.inspeccion_producto.olor,
      data.inspeccion_producto.color,
      data.inspeccion_producto.textura,
      data.inspeccion_producto.estado_empaque,
      data.inspeccion_producto.certificado_calidad,
      data.inspeccion_vehiculo.limpieza_vehiculo && data.inspeccion_vehiculo.transporte_vehiculo,
      data.observaciones,
      data.inspeccion_producto.decision_producto,
      data.recibido_por
    ];

    if (columnasInspeccion.has('observaciones_producto')) {
      camposInspeccion.push('observaciones_producto');
      inspeccionValues.push(data.inspeccion_producto.observaciones_producto);
    }

    if (columnasInspeccion.has('observaciones_vehiculo')) {
      camposInspeccion.push('observaciones_vehiculo');
      inspeccionValues.push(data.inspeccion_vehiculo.observaciones_vehiculo);
    }

    if (columnasInspeccion.has('vehiculo')) {
      camposInspeccion.push('vehiculo');
      inspeccionValues.push(data.inspeccion_vehiculo.vehiculo);
    }

    if (columnasInspeccion.has('conductor')) {
      camposInspeccion.push('conductor');
      inspeccionValues.push(data.inspeccion_vehiculo.conductor);
    }

    if (columnasInspeccion.has('placa')) {
      camposInspeccion.push('placa');
      inspeccionValues.push(data.inspeccion_vehiculo.placa);
    }

    if (columnasInspeccion.has('limpieza_vehiculo')) {
      camposInspeccion.push('limpieza_vehiculo');
      inspeccionValues.push(data.inspeccion_vehiculo.limpieza_vehiculo);
    }

    if (columnasInspeccion.has('transporte_vehiculo')) {
      camposInspeccion.push('transporte_vehiculo');
      inspeccionValues.push(data.inspeccion_vehiculo.transporte_vehiculo);
    }

    const placeholdersInspeccion = camposInspeccion.map((_, index) => `$${index + 1}`).join(',');
    const inspeccionQuery = `
      INSERT INTO reception_inspections (${camposInspeccion.join(',')})
      VALUES (${placeholdersInspeccion})
      RETURNING *
    `;

    const inspeccionRes = await client.query(inspeccionQuery, inspeccionValues);
    await client.query('COMMIT');
    return { recepcion, inspeccion: inspeccionRes.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listarRecepciones() {
  const query = `
    SELECT r.*, p.nombre AS proveedor_nombre, rm.nombre AS materia_prima_nombre
    FROM receptions r
    JOIN providers p ON p.id = r.proveedor_id
    JOIN raw_materials rm ON rm.id = r.materia_prima_id
    ORDER BY r.id ASC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}

export async function buscarRecepcionPorId(id) {
  const { rows } = await poolPostgres.query('SELECT * FROM receptions WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function buscarContextoRecepcionBlockchain(id) {
  const client = await poolPostgres.connect();
  try {
    const columnasRecepciones = await obtenerColumnasTabla(client, 'receptions');
    const columnasInspeccion = await obtenerColumnasTabla(client, 'reception_inspections');

    const numeroLoteExpr = columnasRecepciones.has('numero_lote')
      ? 'COALESCE(r.numero_lote, r.lote_proveedor)'
      : 'r.lote_proveedor';
    const presentacionExpr = columnasRecepciones.has('presentacion')
      ? 'COALESCE(r.presentacion, r.unidad_presentacion)'
      : 'r.unidad_presentacion';

  const query = `
    SELECT
      r.id,
      r.fecha_recepcion,
      ${numeroLoteExpr} AS numero_lote,
      r.fecha_vencimiento,
      r.cantidad,
      ${presentacionExpr} AS presentacion,
      r.temperatura_recepcion,
      i.decision_final,
      ${columnasInspeccion.has('vehiculo') ? 'i.vehiculo' : 'NULL::varchar AS vehiculo'},
      ${columnasInspeccion.has('conductor') ? 'i.conductor' : 'NULL::varchar AS conductor'},
      ${columnasInspeccion.has('placa') ? 'i.placa' : 'NULL::varchar AS placa'},
      ${columnasInspeccion.has('limpieza_vehiculo') ? 'i.limpieza_vehiculo' : 'NULL::boolean AS limpieza_vehiculo'},
      ${columnasInspeccion.has('transporte_vehiculo') ? 'i.transporte_vehiculo' : 'NULL::boolean AS transporte_vehiculo'},
      r.estado_recepcion,
      p.nombre AS proveedor_nombre,
      rm.nombre AS materia_prima_nombre
    FROM receptions r
    JOIN providers p ON p.id = r.proveedor_id
    JOIN raw_materials rm ON rm.id = r.materia_prima_id
    LEFT JOIN reception_inspections i ON i.reception_id = r.id
    WHERE r.id = $1
  `;

    const { rows } = await client.query(query, [id]);
    return rows[0] || null;
  } finally {
    client.release();
  }
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
