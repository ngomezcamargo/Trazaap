import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { poolPostgres } from '../src/configuracion/postgresql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlDir = path.join(__dirname, '..', 'sql');
  const file = '001_schema_actual.sql';
  const sqlPath = path.join(sqlDir, file);
  const sql = await fs.readFile(sqlPath, 'utf8');

  let transactionStarted = false;
  try {
    await poolPostgres.query('BEGIN');
    transactionStarted = true;
    await poolPostgres.query(sql);
    await poolPostgres.query('COMMIT');
    transactionStarted = false;
    console.log(`Schema actual ${file} aplicado`);
  } catch (error) {
    if (transactionStarted) await poolPostgres.query('ROLLBACK');
    throw error;
  } finally {
    await poolPostgres.end();
  }
}

run().catch(async (error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
