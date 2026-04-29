import { poolPostgres } from '../../configuracion/postgresql.js';

export async function crearProveedor(data) {
  const query = `
    INSERT INTO providers (nombre, nit, contacto, nombre_contacto, telefono, email, direccion, certificaciones, estado)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    data.nombre,
    data.nit,
    data.nombre_contacto,
    data.nombre_contacto,
    data.telefono,
    data.email,
    data.direccion,
    data.certificaciones || '',
    data.estado
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0];
}

export async function listarProveedores() {
  const { rows } = await poolPostgres.query('SELECT * FROM providers ORDER BY id ASC');
  return rows;
}

export async function buscarProveedorPorId(id) {
  const { rows } = await poolPostgres.query('SELECT * FROM providers WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function actualizarProveedor(id, data) {
  const query = `
    UPDATE providers
    SET nombre = $1,
        nit = $2,
        contacto = $3,
        nombre_contacto = $4,
        telefono = $5,
        email = $6,
        direccion = $7,
        certificaciones = $8,
        estado = $9,
        updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `;

  const values = [
    data.nombre,
    data.nit,
    data.nombre_contacto,
    data.nombre_contacto,
    data.telefono,
    data.email,
    data.direccion,
    data.certificaciones || '',
    data.estado,
    id
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0] || null;
}

export async function eliminarProveedor(id) {
  const { rowCount } = await poolPostgres.query('DELETE FROM providers WHERE id = $1', [id]);
  return rowCount > 0;
}
