import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { poolPostgres } from '../src/configuracion/postgresql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlDir = path.join(__dirname, '..', 'sql');
  const entries = await fs.readdir(sqlDir);
  const files = entries.filter((name) => name.endsWith('.sql')).sort();

  for (const file of files) {
    const sqlPath = path.join(sqlDir, file);
    const sql = await fs.readFile(sqlPath, 'utf8');
    await poolPostgres.query(sql);
    console.log(`Migration ${file} applied`);
  }

  await poolPostgres.end();
}

run().catch(async (error) => {
  console.error('Migration failed:', error.message);
  await poolPostgres.end();
  process.exit(1);
});
