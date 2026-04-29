import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'trazaap',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

try {
  const result = await pool.query('SELECT 1 as ok');
  console.log('Conexión OK:', result.rows);
  await pool.end();
} catch (error) {
  console.error('Error PG:', error);
}