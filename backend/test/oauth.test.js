import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPair, SignJWT } from 'jose';
import { autenticarAccessTokenOAuth, validarAccessTokenOAuth } from '../src/modulos/autenticacion/oauth.service.js';
import { requerirOAuth, requerirScopes } from '../src/middlewares/oauthScopes.middleware.js';
import { autenticarJwt } from '../src/middlewares/autenticarJwt.js';
import { intercambioOAuthSchema } from '../src/modulos/autenticacion/oauth-flow.schemas.js';
import { leerRefreshCookie, opcionesCookieRefresh } from '../src/modulos/autenticacion/oauth-flow.service.js';

const issuer = 'https://auth.example.test/realms/trazaap';
const audience = 'trazaap-api';
const { privateKey, publicKey } = await generateKeyPair('RS256', { modulusLength: 2048 });

async function token({ subject = 'usuario-externo', scope = 'trazaap.read epcis.query', expires = '15m' } = {}) {
  return new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', kid: 'prueba' })
    .setIssuer(issuer).setAudience(audience).setSubject(subject)
    .setIssuedAt().setExpirationTime(expires).sign(privateKey);
}

test('OAuth valida access token RS256, issuer, audience, expiracion y scopes', async () => {
  const accessToken = await token();
  const payload = await validarAccessTokenOAuth(accessToken, { key: publicKey, issuer, audience, algorithms: ['RS256'] });
  assert.equal(payload.sub, 'usuario-externo');
  const usuario = await autenticarAccessTokenOAuth(accessToken, {
    key: publicKey, issuer, audience, algorithms: ['RS256'],
    resolverUsuario: async () => ({ id: 7, email: 'interno@example.test', role: 'gerente' })
  });
  assert.deepEqual(usuario.scopes, ['trazaap.read', 'epcis.query']);
  assert.equal(usuario.sub, 7);
  assert.equal(usuario.authType, 'oauth');
});

test('OAuth rechaza token vencido, issuer incorrecto e identidad inactiva/no vinculada', async () => {
  await assert.rejects(async () => validarAccessTokenOAuth(await token({ expires: 0 }), { key: publicKey, issuer, audience, algorithms: ['RS256'] }));
  await assert.rejects(async () => validarAccessTokenOAuth(await token(), { key: publicKey, issuer: 'https://otro.example', audience, algorithms: ['RS256'] }));
  await assert.rejects(async () => autenticarAccessTokenOAuth(await token(), {
    key: publicKey, issuer, audience, algorithms: ['RS256'], resolverUsuario: async () => null
  }), (error) => error.status === 401);
});

test('middleware OAuth diferencia 401 por mecanismo y 403 por scope', async () => {
  const ejecutar = (middleware, usuario) => new Promise((resolve) => middleware({ usuario }, {}, (error) => resolve(error || null)));
  assert.equal((await ejecutar(requerirOAuth, { authType: 'legacy' })).status, 401);
  assert.equal((await ejecutar(requerirScopes('epcis.query'), { authType: 'oauth', scopes: ['trazaap.read'] })).status, 403);
  assert.equal(await ejecutar(requerirScopes('epcis.query'), { authType: 'oauth', scopes: ['epcis.query'] }), null);
});

test('OAuth rechaza endpoint sin bearer y limita intercambio PKCE', async () => {
  const error = await new Promise((resolve) => autenticarJwt({ headers: {} }, {}, (fallo) => resolve(fallo)));
  assert.equal(error.status, 401);
  assert.equal(intercambioOAuthSchema.safeParse({ code: 'codigo-valido', code_verifier: 'a'.repeat(43) }).success, true);
  assert.equal(intercambioOAuthSchema.safeParse({ code: 'codigo-valido', code_verifier: 'corto', campo_extra: true }).success, false);
});

test('refresh OAuth usa cookie HttpOnly SameSite Strict y puede recuperarse sin exponerla a JS', () => {
  const opciones = opcionesCookieRefresh();
  assert.equal(opciones.httpOnly, true);
  assert.equal(opciones.sameSite, 'strict');
  assert.equal(opciones.maxAge, 8 * 60 * 60 * 1000);
  assert.equal(leerRefreshCookie({ headers: { cookie: 'otra=1; trazaap_oauth_refresh=refresh%20token' } }), 'refresh token');
});
