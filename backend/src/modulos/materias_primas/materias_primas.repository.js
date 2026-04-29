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
    INSERT INTO raw_materials (nombre, descripcion, unidad_medida, condiciones_almacenamiento, proveedor_id, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    data.nombre,
    data.descripcion || '',
    data.unidad_medida,
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
        condiciones_almacenamiento = $4,
        proveedor_id = $5,
        is_active = $6,
        updated_at = NOW()
    WHERE id = $7
    RETURNING *
  `;

  const values = [
    data.nombre,
    data.descripcion || '',
    data.unidad_medida,
    data.condiciones_almacenamiento || '',
    data.proveedor_id || null,
    data.is_active,
    id
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0] || null;
}
