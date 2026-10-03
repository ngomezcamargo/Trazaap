import 'dotenv/config';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const destino = path.join(os.tmpdir(), `trazaap-epcis-${process.pid}-${Date.now()}.json`);
try {
  execFileSync(process.execPath, ['scripts/preparar-schema-epcis.js', destino], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit'
  });
  execFileSync(process.execPath, ['--test', 'test/epcis-schema.test.js'], {
    cwd: process.cwd(),
    env: { ...process.env, RUN_EPCIS_SCHEMA_TESTS: 'true', EPCIS_ENABLED: 'true', EPCIS_SCHEMA_PATH: destino },
    stdio: 'inherit'
  });
} finally {
  await fs.rm(destino, { force: true });
}
