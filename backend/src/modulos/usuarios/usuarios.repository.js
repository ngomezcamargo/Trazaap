import { poolPostgres } from '../../configuracion/postgresql.js';

const CAMPOS_PUBLICOS = `u.id, u.email, r.name AS role, u.is_active, u.created_at, u.updated_at`;

export async function listarUsuarios() {
  const { rows } = await poolPostgres.query(`
    SELECT ${CAMPOS_PUBLICOS}
    FROM users u JOIN roles r ON r.id = u.role_id
    ORDER BY u.email
  `);
  return rows;
}

export async function buscarUsuarioGestion(id) {
  const { rows } = await poolPostgres.query(`
    SELECT ${CAMPOS_PUBLICOS}
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = $1
  `, [id]);
  return rows[0] || null;
}

export async function buscarUsuarioGestionPorEmail(email) {
  const { rows } = await poolPostgres.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0] || null;
}

export async function crearUsuario({ email, passwordHash, role }) {
  const { rows } = await poolPostgres.query(`
    INSERT INTO users (email, password_hash, role_id)
    SELECT $1, $2, id FROM roles WHERE name = $3
    RETURNING id, email, is_active, created_at, updated_at
  `, [email, passwordHash, role]);
  return { ...rows[0], role };
}

export async function actualizarUsuario(id, { email, passwordHash, role, is_active: isActive }) {
  const cliente = await poolPostgres.connect();
  try {
    await cliente.query('BEGIN');
    const actual = await cliente.query(`
      SELECT u.id, u.is_active, r.name AS role
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1 FOR UPDATE
    `, [id]);
    if (!actual.rows[0]) {
      await cliente.query('ROLLBACK');
      return null;
    }
    if (actual.rows[0].role === 'administrador' && (role !== 'administrador' || !isActive)) {
      const conteo = await cliente.query(`
        SELECT COUNT(*)::integer AS total
        FROM users u JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'administrador' AND u.is_active = true
      `);
      if (conteo.rows[0].total <= 1) {
        const error = new Error('ULTIMO_ADMINISTRADOR');
        throw error;
      }
    }
    const { rows } = await cliente.query(`
      UPDATE users
      SET email = $2,
          role_id = (SELECT id FROM roles WHERE name = $3),
          is_active = $4,
          password_hash = COALESCE($5, password_hash),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, is_active, created_at, updated_at
    `, [id, email, role, isActive, passwordHash || null]);
    await cliente.query('COMMIT');
    return { ...rows[0], role };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
