import assert from 'node:assert/strict';
import test from 'node:test';
import { rolesMiddleware } from '../src/middlewares/roles.middleware.js';

function ejecutarMiddleware(rolUsuario, ...rolesPermitidos) {
  return new Promise((resolve) => {
    const req = { usuario: { role: rolUsuario } };
    const res = {};
    const middleware = rolesMiddleware(...rolesPermitidos);

    middleware(req, res, (err) => resolve(err || null));
  });
}

test('rolesMiddleware permite al administrador en rutas restringidas', async () => {
  const error = await ejecutarMiddleware('administrador', 'operario');

  assert.equal(error, null);
});

test('rolesMiddleware permite al rol explicitamente autorizado', async () => {
  const error = await ejecutarMiddleware('gerente', 'gerente', 'operario');

  assert.equal(error, null);
});

test('rolesMiddleware responde 403 cuando el rol no tiene permiso', async () => {
  const error = await ejecutarMiddleware('operario', 'gerente');

  assert.equal(error.status, 403);
  assert.equal(error.message, 'No tienes permisos para esta accion');
});

test('rolesMiddleware responde 403 cuando el usuario no tiene rol valido', async () => {
  const error = await ejecutarMiddleware(null, 'gerente');

  assert.equal(error.status, 403);
  assert.equal(error.message, 'Usuario sin rol asociado');
});
