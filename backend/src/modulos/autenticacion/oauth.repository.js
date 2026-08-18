import { poolPostgres } from '../../configuracion/postgresql.js';

export async function buscarUsuarioPorIdentidadOAuth(issuer, subject, db = poolPostgres) {
  const { rows } = await db.query(`
    UPDATE oauth_identities oi
    SET last_seen_at = NOW()
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE oi.user_id = u.id
      AND oi.issuer = $1
      AND oi.subject = $2
      AND u.is_active = true
    RETURNING u.id, u.email, r.name AS role
  `, [issuer, subject]);
  return rows[0] || null;
}
