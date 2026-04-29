import { ErrorHttp } from './errorHttp.js';

export function validarSolicitud(schema, source = 'body') {
  return (req, res, next) => {
    const resultado = schema.safeParse(req[source]);
    if (!resultado.success) {
      return next(new ErrorHttp(400, resultado.error.issues[0]?.message || 'Entrada invalida'));
    }

    req[source] = resultado.data;
    return next();
  };
}
