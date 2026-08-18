import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { entorno } from '../../configuracion/entorno.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { normalizarRol } from '../../utilidades/roles.util.js';
import { buscarUsuarioPorIdentidadOAuth } from './oauth.repository.js';

let jwksRemoto;

function obtenerJwksRemoto() {
  if (!entorno.auth.jwksUri) throw new Error('OAUTH_JWKS_URI no configurado');
  if (!jwksRemoto) jwksRemoto = createRemoteJWKSet(new URL(entorno.auth.jwksUri));
  return jwksRemoto;
}

export function obtenerScopes(payload) {
  const valores = Array.isArray(payload.scp) ? payload.scp : String(payload.scope || '').split(/\s+/);
  return [...new Set(valores.map((value) => String(value).trim()).filter(Boolean))];
}

export async function validarAccessTokenOAuth(token, opciones = {}) {
  const issuer = opciones.issuer ?? entorno.auth.issuer;
  const audience = opciones.audience ?? entorno.auth.audience;
  const algorithms = opciones.algorithms ?? entorno.auth.algorithms;
  if (!issuer || !audience) throw new Error('OAuth issuer/audience no configurados');
  const resultado = await jwtVerify(token, opciones.key || obtenerJwksRemoto(), {
    issuer,
    audience,
    algorithms,
    requiredClaims: ['sub', 'iat', 'exp']
  });
  return resultado.payload;
}

export async function autenticarAccessTokenOAuth(token, opciones = {}) {
  const payload = await validarAccessTokenOAuth(token, opciones);
  const resolverUsuario = opciones.resolverUsuario || buscarUsuarioPorIdentidadOAuth;
  const usuario = await resolverUsuario(payload.iss, payload.sub);
  if (!usuario) throw new ErrorHttp(401, 'Identidad OAuth no vinculada o usuario inactivo');
  return {
    sub: usuario.id,
    email: usuario.email,
    role: normalizarRol(usuario.role),
    scopes: obtenerScopes(payload),
    authType: 'oauth',
    oauthSubject: payload.sub,
    tokenId: payload.jti || null
  };
}

export function esTokenAsimetrico(token) {
  try {
    return entorno.auth.algorithms.includes(decodeProtectedHeader(token).alg);
  } catch {
    return false;
  }
}
