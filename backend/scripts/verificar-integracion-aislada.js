import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import pg from 'pg';

const { Client } = pg;
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const database = `trazaap_it_${Date.now()}_${process.pid}`.replace(/[^a-z0-9_]/gi, '');
const port = Number(process.env.RF05_ISOLATED_PORT || 4400);
const apiUrl = process.env.RF05_ISOLATED_API_URL || `http://127.0.0.1:${port}/api`;
const frontendUrl = process.env.RF05_FRONTEND_URL || 'http://127.0.0.1:3000';
const envBase = {
  ...process.env,
  POSTGRES_DB: database,
  PORT: String(port),
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'Admin123*',
  SEED_GERENTE_PASSWORD: process.env.SEED_GERENTE_PASSWORD || 'Gerente123*',
  SEED_OPERARIO_PASSWORD: process.env.SEED_OPERARIO_PASSWORD || 'Operario123*',
  RF05_API_URL: apiUrl,
  RF05_FRONTEND_URL: frontendUrl,
  DIAS_ALERTA_VENCIMIENTO: '0'
};

function clientePostgres(baseDatos) {
  return new Client({
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: Number(process.env.POSTGRES_PORT || 5433),
    database: baseDatos,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  });
}

async function esperarApi() {
  const limite = Date.now() + 60000;
  while (Date.now() < limite) {
    try {
      const response = await fetch(`${apiUrl}/health`);
      if (response.ok) return;
    } catch {
      // El servidor aún está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`La API aislada no inició en ${apiUrl}`);
}

async function reservarIdentidadesFabricAisladas(client) {
  const base = Number(String(Date.now()).slice(-7));
  const { rows } = await client.query(
    `SELECT sequence_schema, sequence_name
     FROM information_schema.sequences
     WHERE sequence_schema = 'public'`
  );
  for (const sequence of rows) {
    const nombre = `${sequence.sequence_schema}.${sequence.sequence_name}`;
    await client.query('SELECT setval($1::regclass, $2, false)', [nombre, base]);
  }
  console.log(`Identidades temporales reservadas desde ${base}`);
}

async function main() {
  const admin = clientePostgres('postgres');
  let servidor;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${database}"`);
    console.log(`Base aislada creada: ${database}`);

    execFileSync(process.execPath, ['scripts/migrate.js'], {
      cwd: backendRoot,
      env: envBase,
      stdio: 'inherit'
    });
    execFileSync(process.execPath, ['scripts/seed.js'], {
      cwd: backendRoot,
      env: envBase,
      stdio: 'inherit'
    });
    const aislada = clientePostgres(database);
    await aislada.connect();
    try {
      await reservarIdentidadesFabricAisladas(aislada);
    } finally {
      await aislada.end();
    }

    servidor = spawn(process.execPath, ['src/server.js'], {
      cwd: backendRoot,
      env: envBase,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    servidor.on('error', (error) => console.error(`[API aislada] Error de proceso: ${error.message}`));
    servidor.on('exit', (codigo, senal) => {
      if (codigo !== null || senal) console.error(`[API aislada] Finalizo antes de tiempo: codigo=${codigo} senal=${senal || '-'}`);
    });
    servidor.stdout.on('data', (data) => process.stdout.write(`[API aislada] ${data}`));
    servidor.stderr.on('data', (data) => process.stderr.write(`[API aislada] ${data}`));
    await esperarApi();

    execFileSync(process.execPath, ['scripts/verificar-rf05.js'], {
      cwd: backendRoot,
      env: envBase,
      stdio: 'inherit'
    });
    console.log('INTEGRACION_AISLADA_VERIFICADA');
  } finally {
    if (servidor && !servidor.killed) servidor.kill('SIGTERM');
    try {
      await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [database]);
      await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
      console.log(`Base aislada eliminada: ${database}`);
    } catch (error) {
      console.error(`No se pudo eliminar la base aislada ${database}: ${error.message}`);
    }
    await admin.end();
  }
}

main().catch((error) => {
  console.error('Integración aislada fallida:', error.message);
  process.exitCode = 1;
});
