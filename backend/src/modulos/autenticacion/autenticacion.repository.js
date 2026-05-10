import { poolPostgres } from '../../configuracion/postgresql.js';

export async function buscarUsuarioPorEmail(email) {
  const query = `
    SELECT u.id, u.email, u.password_hash, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.email = $1 AND u.is_active = true
  `;

  const { rows } = await poolPostgres.query(query, [email]);
  return rows[0] || null;
}

export async function buscarUsuarioPorId(id) {
  const query = `
    SELECT u.id, u.email, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = $1 AND u.is_active = true
  `;

  const { rows } = await poolPostgres.query(query, [id]);
  return rows[0] || null;
}

export async function listarUsuariosOperarios() {
  const query = `
    SELECT u.id, u.email, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.is_active = true AND lower(r.name) = 'operario'
    ORDER BY u.email ASC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}
