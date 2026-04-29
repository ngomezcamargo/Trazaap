import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { poolPostgres } from '../src/configuracion/postgresql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlPath = path.join(__dirname, '..', 'sql', '001_init.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');

  await poolPostgres.query(sql);
  console.log('Migration 001_init.sql applied');
  await poolPostgres.end();
}

run().catch(async (error) => {
  console.error('Migration failed:', error.message);
  await poolPostgres.end();
  process.exit(1);
});
