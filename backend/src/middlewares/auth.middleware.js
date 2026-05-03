import jwt from 'jsonwebtoken';
import { entorno } from '../configuracion/entorno.js';
import { ErrorHttp } from './errorHttp.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ErrorHttp(401, 'Token requerido'));
  }

  const token = authHeader.slice(7);
  try {
    req.usuario = jwt.verify(token, entorno.jwtSecret);
    return next();
  } catch {
    return next(new ErrorHttp(401, 'Token invalido o expirado'));
  }
}
