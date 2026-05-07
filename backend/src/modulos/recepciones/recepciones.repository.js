import { poolPostgres } from '../../configuracion/postgresql.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';

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
    const columnasMaterias = await obtenerColumnasTabla(client, 'raw_materials');

    const tienePresentacion = columnasRecepciones.has('presentacion');
    const tieneNumeroLote = columnasRecepciones.has('numero_lote');
    const tienePesoRecibido = columnasRecepciones.has('peso_recibido');
    const tieneUnidadMedida = columnasRecepciones.has('unidad_medida');

    const unidadMateriaPrimaQuery = `
      SELECT ${columnasMaterias.has('unidad_medida_base') ? 'unidad_medida_base' : 'unidad_medida'} AS unidad
      FROM raw_materials
      WHERE id = $1
    `;
    const unidadMateriaPrimaRes = await client.query(unidadMateriaPrimaQuery, [data.materia_prima_id]);
    const unidadBase = unidadMateriaPrimaRes.rows[0]?.unidad;
    data.unidad_medida = unidadBase || data.unidad_medida || 'unidad';

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

    if (tieneUnidadMedida) {
      camposRecepcion.push('unidad_medida');
      values.push(data.unidad_medida);
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
      'inspeccion_transporte',
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
      data.inspeccion_transporte.condiciones_vehiculo && data.inspeccion_transporte.higiene_conductor,
      data.observaciones,
      data.inspeccion_producto.decision_producto,
      data.recibido_por
    ];

    if (columnasInspeccion.has('observaciones_producto')) {
      camposInspeccion.push('observaciones_producto');
      inspeccionValues.push(data.inspeccion_producto.observaciones_producto);
    }

    if (columnasInspeccion.has('observaciones_transporte')) {
      camposInspeccion.push('observaciones_transporte');
      inspeccionValues.push(data.inspeccion_transporte.observaciones_transporte);
    }

    if (columnasInspeccion.has('condiciones_vehiculo')) {
      camposInspeccion.push('condiciones_vehiculo');
      inspeccionValues.push(data.inspeccion_transporte.condiciones_vehiculo);
    }

    if (columnasInspeccion.has('higiene_conductor')) {
      camposInspeccion.push('higiene_conductor');
      inspeccionValues.push(data.inspeccion_transporte.higiene_conductor);
    }

    const placeholdersInspeccion = camposInspeccion.map((_, index) => `$${index + 1}`).join(',');
    const inspeccionQuery = `
      INSERT INTO reception_inspections (${camposInspeccion.join(',')})
      VALUES (${placeholdersInspeccion})
      RETURNING *
    `;

    const inspeccionRes = await client.query(inspeccionQuery, inspeccionValues);

    if (data.estado_recepcion === 'aceptado') {
      const inventarioExistente = await client.query(
        'SELECT unidad_medida FROM inventario_materias_primas WHERE materia_prima_id = $1',
        [data.materia_prima_id]
      );

      if (
        inventarioExistente.rows[0]?.unidad_medida
        && inventarioExistente.rows[0].unidad_medida !== data.unidad_medida
      ) {
        throw new ErrorHttp(400, 'La unidad de medida de la recepcion no coincide con la unidad registrada en inventario para esta materia prima.');
      }

      const inventarioQuery = `
        INSERT INTO inventario_materias_primas (materia_prima_id, cantidad_disponible, unidad_medida, fecha_actualizacion)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (materia_prima_id)
        DO UPDATE SET
          cantidad_disponible = inventario_materias_primas.cantidad_disponible + EXCLUDED.cantidad_disponible,
          unidad_medida = EXCLUDED.unidad_medida,
          fecha_actualizacion = NOW()
      `;

      await client.query(inventarioQuery, [data.materia_prima_id, data.cantidad, data.unidad_medida]);

      await client.query(
        `INSERT INTO inventario_movimientos (
          materia_prima_id, tipo_movimiento, cantidad, unidad_medida,
          referencia_tipo, referencia_id, observaciones, creado_por
        ) VALUES ($1, 'entrada', $2, $3, 'recepcion', $4, $5, $6)`,
        [
          data.materia_prima_id,
          data.cantidad,
          data.unidad_medida,
          recepcion.id,
          `Entrada por recepcion ${data.numero_lote}`,
          String(data.recibido_por)
        ]
      );
    }

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

export async function obtenerDetalleRecepcion(id) {
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

    const detalleQuery = `
      SELECT
        r.id,
        r.fecha_recepcion,
        p.nombre AS proveedor,
        rm.nombre AS materia_prima,
        r.cantidad,
        ${columnasRecepciones.has('unidad_medida') ? 'r.unidad_medida' : 'NULL::varchar AS unidad_medida'},
        ${presentacionExpr} AS presentacion,
        ${numeroLoteExpr} AS numero_lote,
        r.temperatura_recepcion AS temperatura,
        r.fecha_vencimiento,
        r.recibido_por,
        r.estado_recepcion,
        r.observaciones,
        i.olor,
        i.color,
        i.textura,
        i.estado_empaque,
        i.certificado_calidad,
        i.decision_final,
        ${columnasInspeccion.has('observaciones_producto') ? 'i.observaciones_producto' : 'NULL::text AS observaciones_producto'},
        ${columnasInspeccion.has('condiciones_vehiculo') ? 'i.condiciones_vehiculo' : 'NULL::boolean AS condiciones_vehiculo'},
        ${columnasInspeccion.has('higiene_conductor') ? 'i.higiene_conductor' : 'NULL::boolean AS higiene_conductor'},
        ${columnasInspeccion.has('observaciones_transporte') ? 'i.observaciones_transporte' : 'NULL::text AS observaciones_transporte'}
      FROM receptions r
      JOIN providers p ON p.id = r.proveedor_id
      JOIN raw_materials rm ON rm.id = r.materia_prima_id
      LEFT JOIN reception_inspections i ON i.reception_id = r.id
      WHERE r.id = $1
    `;

    const detalleRes = await client.query(detalleQuery, [id]);
    const detalle = detalleRes.rows[0] || null;
    if (!detalle) return null;

    const blockchainQuery = `
      SELECT hash, tipo_evento, fecha_evento
      FROM eventos_blockchain
      WHERE lote = $1
      ORDER BY fecha_evento DESC
      LIMIT 5
    `;
    const blockchainRes = await client.query(blockchainQuery, [detalle.numero_lote]);

    return {
      ...detalle,
      blockchain: blockchainRes.rows
    };
  } finally {
    client.release();
  }
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
      ${columnasRecepciones.has('unidad_medida') ? 'r.unidad_medida' : 'NULL::varchar AS unidad_medida'},
      ${presentacionExpr} AS presentacion,
      r.temperatura_recepcion,
      i.decision_final,
      ${columnasInspeccion.has('condiciones_vehiculo') ? 'i.condiciones_vehiculo' : 'NULL::boolean AS condiciones_vehiculo'},
      ${columnasInspeccion.has('higiene_conductor') ? 'i.higiene_conductor' : 'NULL::boolean AS higiene_conductor'},
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
