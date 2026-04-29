import pg from 'pg';
import { entorno } from './entorno.js';

const { Pool } = pg;

export const poolPostgres = new Pool({
  host: entorno.postgres.host,
  port: entorno.postgres.port,
  database: entorno.postgres.database,
  user: entorno.postgres.user,
  password: entorno.postgres.password,
  ssl: false
});

export async function probarConexionPostgres() {
  await poolPostgres.query('SELECT 1 AS ok');
}
