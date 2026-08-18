import { ErrorHttp } from './errorHttp.js';

export function requerirOAuth(req, res, next) {
  if (req.usuario?.authType !== 'oauth') return next(new ErrorHttp(401, 'Se requiere access token OAuth 2.0'));
  return next();
}

export function requerirScopes(...scopesRequeridos) {
  return (req, res, next) => {
    const disponibles = new Set(req.usuario?.scopes || []);
    const faltantes = scopesRequeridos.filter((scope) => !disponibles.has(scope));
    if (faltantes.length) return next(new ErrorHttp(403, 'Scope insuficiente', { scopes_requeridos: scopesRequeridos }));
    return next();
  };
}
