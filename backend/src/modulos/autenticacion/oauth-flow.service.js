import { entorno } from '../../configuracion/entorno.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';

const COOKIE = 'trazaap_oauth_refresh';
const OCHO_HORAS_MS = 8 * 60 * 60 * 1000;

function configuracionValida() {
  return entorno.auth.oauthEnabled && entorno.auth.authorizationUrl && entorno.auth.tokenUrl
    && entorno.auth.clientId && entorno.auth.redirectUri;
}

export function configuracionOAuthPublica() {
  if (!configuracionValida()) return { enabled: false };
  return { enabled: true, authorizationUrl: entorno.auth.authorizationUrl, clientId: entorno.auth.clientId, redirectUri: entorno.auth.redirectUri, scope: entorno.auth.scopes };
}

function parametrosCliente() { return entorno.auth.clientSecret ? { client_secret: entorno.auth.clientSecret } : {}; }

async function solicitarTokens(parametros) {
  if (!configuracionValida()) throw new ErrorHttp(503, 'OAuth 2.0 no configurado');
  const respuesta = await fetch(entorno.auth.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: entorno.auth.clientId, ...parametrosCliente(), ...parametros }) });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !cuerpo.access_token) throw new ErrorHttp(401, 'Intercambio OAuth rechazado');
  return cuerpo;
}

export function opcionesCookieRefresh() { return { httpOnly: true, secure: entorno.auth.secureCookies, sameSite: 'strict', path: `${entorno.apiPrefix}/auth/oauth`, maxAge: OCHO_HORAS_MS }; }
export async function intercambiarCodigo(code, codeVerifier) { return solicitarTokens({ grant_type: 'authorization_code', code, code_verifier: codeVerifier, redirect_uri: entorno.auth.redirectUri }); }
export async function renovarAccessToken(refreshToken) { if (!refreshToken) throw new ErrorHttp(401, 'Sesion OAuth no disponible'); return solicitarTokens({ grant_type: 'refresh_token', refresh_token: refreshToken }); }
export async function revocarRefreshToken(refreshToken) { if (!refreshToken || !entorno.auth.revocationUrl) return; await fetch(entorno.auth.revocationUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: entorno.auth.clientId, ...parametrosCliente(), token: refreshToken, token_type_hint: 'refresh_token' }) }).catch(() => {}); }
export function leerRefreshCookie(req) { const valor = String(req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`)); return valor ? decodeURIComponent(valor.slice(COOKIE.length + 1)) : ''; }
export const nombreCookieRefresh = COOKIE;
