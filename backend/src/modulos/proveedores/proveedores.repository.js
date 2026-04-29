import { poolPostgres } from '../../configuracion/postgresql.js';

export async function crearProveedor(data) {
  const query = `
    INSERT INTO providers (nombre, nit, contacto, telefono, email, direccion, estado)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    data.nombre,
    data.nit,
    data.contacto,
    data.telefono,
    data.email,
    data.direccion,
    data.estado
  ];

  const { rows } = await poolPostgres.query(query, values);
  return rows[0];
}

export async function listarProveedores() {
  const { rows } = await poolPostgres.query('SELECT * FROM providers ORDER BY id DESC');
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
        telefono = $4,
        email = $5,
        direccion = $6,
        estado = $7,
        updated_at = NOW()
    WHERE id = $8
    RETURNING *
  `;

  const values = [
    data.nombre,
    data.nit,
    data.contacto,
    data.telefono,
    data.email,
    data.direccion,
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
