import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarMateriasPrimas() {
  const query = `
    SELECT rm.*, p.nombre AS proveedor_nombre
    FROM raw_materials rm
    LEFT JOIN providers p ON p.id = rm.proveedor_id
    ORDER BY rm.id ASC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}

export async function crearMateriaPrima(data) {
  const query = `
    INSERT INTO raw_materials (
      nombre,
      descripcion,
      unidad_medida,
      unidad_medida_base,
      descripcion_unidad_personalizada,
      tipo_insumo,
      condiciones_almacenamiento,
      proveedor_id,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const unidadBase = data.unidad_medida_base;
  const unidadNormalizada = unidadBase === 'otro'
    ? data.descripcion_unidad_personalizada.trim().toLowerCase()
    : unidadBase;

  const values = [
    data.nombre,
    data.descripcion || '',
    unidadNormalizada,
    unidadBase,
    data.descripcion_unidad_personalizada || '',
    data.tipo_insumo || null,
    data.condiciones_almacenamiento || '',
    data.proveedor_id || null,
    data.is_active
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0];
}

export async function actualizarMateriaPrima(id, data) {
  const query = `
    UPDATE raw_materials
    SET nombre = $1,
        descripcion = $2,
        unidad_medida = $3,
        unidad_medida_base = $4,
        descripcion_unidad_personalizada = $5,
        tipo_insumo = $6,
        condiciones_almacenamiento = $7,
        proveedor_id = $8,
        is_active = $9,
        updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `;

  const unidadBase = data.unidad_medida_base;
  const unidadNormalizada = unidadBase === 'otro'
    ? data.descripcion_unidad_personalizada.trim().toLowerCase()
    : unidadBase;

  const values = [
    data.nombre,
    data.descripcion || '',
    unidadNormalizada,
    unidadBase,
    data.descripcion_unidad_personalizada || '',
    data.tipo_insumo || null,
    data.condiciones_almacenamiento || '',
    data.proveedor_id || null,
    data.is_active,
    id
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0] || null;
}
