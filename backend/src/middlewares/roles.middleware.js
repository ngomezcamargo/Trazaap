import { ErrorHttp } from './errorHttp.js';

export function rolesMiddleware(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario?.role) {
      return next(new ErrorHttp(403, 'Usuario sin rol asociado'));
    }

    if (!rolesPermitidos.includes(req.usuario.role)) {
      return next(new ErrorHttp(403, 'No tienes permisos para esta accion'));
    }

    return next();
  };
}
