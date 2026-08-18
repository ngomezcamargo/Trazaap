import assert from 'node:assert/strict';
import test from 'node:test';
import { resolverPasswordSeed, USUARIOS_QA } from '../scripts/seed-usuarios-qa.js';

test('el seed define los tres usuarios internos requeridos para QA', () => {
  assert.deepEqual(
    USUARIOS_QA.map(({ email, rol }) => ({ email, rol })),
    [
      { email: 'admin@trazaap.local', rol: 'administrador' },
      { email: 'gerente.pruebas@trazaap.local', rol: 'gerente' },
      { email: 'operario@trazaap.local', rol: 'operario' }
    ]
  );
  assert.equal(new Set(USUARIOS_QA.map(({ email }) => email)).size, 3);
});

test('la credencial del gerente se exige por variable y nunca queda embebida', () => {
  const gerente = USUARIOS_QA.find(({ rol }) => rol === 'gerente');
  assert.equal(gerente.passwordDesarrolloExistente, undefined);
  assert.throws(() => resolverPasswordSeed(gerente, {}), /SEED_GERENTE_PASSWORD/);
  assert.equal(resolverPasswordSeed(gerente, { SEED_GERENTE_PASSWORD: 'valor-solo-prueba' }), 'valor-solo-prueba');
});
