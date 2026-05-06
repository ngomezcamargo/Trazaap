import { ErrorHttp } from './errorHttp.js';
import { normalizarRol, ROLES } from '../utilidades/roles.util.js';

export function rolesMiddleware(...rolesPermitidos) {
  return (req, res, next) => {
    const rolUsuario = normalizarRol(req.usuario?.role);
    const rolesNormalizados = rolesPermitidos.map(normalizarRol);

    if (!rolUsuario) {
      return next(new ErrorHttp(403, 'Usuario sin rol asociado'));
    }

    if (rolUsuario !== ROLES.ADMINISTRADOR && !rolesNormalizados.includes(rolUsuario)) {
      return next(new ErrorHttp(403, 'No tienes permisos para esta accion'));
    }

    return next();
  };
}
