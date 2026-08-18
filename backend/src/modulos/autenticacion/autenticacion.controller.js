import { consultarPerfil, iniciarSesion, listarOperariosService } from './autenticacion.service.js';
import { configuracionOAuthPublica, intercambiarCodigo, leerRefreshCookie, nombreCookieRefresh, opcionesCookieRefresh, renovarAccessToken, revocarRefreshToken } from './oauth-flow.service.js';

export async function iniciarSesionController(req, res) {
  const respuesta = await iniciarSesion(req.body.email, req.body.password);
  res.json(respuesta);
}

export async function perfilController(req, res) {
  const perfil = await consultarPerfil(req.usuario.sub);
  res.json(perfil);
}

export async function listarOperariosController(req, res) {
  const operarios = await listarOperariosService();
  res.json(operarios);
}

function responderTokens(res, tokens) { if (tokens.refresh_token) res.cookie(nombreCookieRefresh, tokens.refresh_token, opcionesCookieRefresh()); res.json({ access_token: tokens.access_token, token_type: tokens.token_type || 'Bearer', expires_in: tokens.expires_in || 900 }); }
export function configuracionOAuthController(req, res) { res.json(configuracionOAuthPublica()); }
export async function intercambioOAuthController(req, res) { responderTokens(res, await intercambiarCodigo(req.body.code, req.body.code_verifier)); }
export async function renovarOAuthController(req, res) { responderTokens(res, await renovarAccessToken(leerRefreshCookie(req))); }
export async function logoutOAuthController(req, res) { await revocarRefreshToken(leerRefreshCookie(req)); res.clearCookie(nombreCookieRefresh, { ...opcionesCookieRefresh(), maxAge: undefined }); res.status(204).end(); }
