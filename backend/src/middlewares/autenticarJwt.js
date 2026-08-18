import jwt from 'jsonwebtoken';
import { entorno } from '../configuracion/entorno.js';
import { ErrorHttp } from './errorHttp.js';
import { autenticarAccessTokenOAuth, esTokenAsimetrico } from '../modulos/autenticacion/oauth.service.js';

export async function autenticarJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ErrorHttp(401, 'Token requerido'));
  }

  const token = authHeader.slice(7);

  try {
    if (entorno.auth.oauthEnabled && esTokenAsimetrico(token)) {
      req.usuario = await autenticarAccessTokenOAuth(token);
    } else {
      if (!entorno.auth.legacyJwtEnabled) throw new Error('JWT legado deshabilitado');
      req.usuario = { ...jwt.verify(token, entorno.jwtSecret), authType: 'legacy', scopes: [] };
    }
    return next();
  } catch {
    return next(new ErrorHttp(401, 'Token invalido o expirado'));
  }
}
