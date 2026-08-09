export function noEncontradoMiddleware(req, res) {
  res.status(404).json({ message: 'Recurso no encontrado' });
}

export function erroresMiddleware(error, req, res, next) {
  const status = error.status || 500;
  const message = status >= 500 ? 'Error interno del servidor' : error.message;

  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    message,
    ...(status < 500 && error.details ? error.details : {})
  });
}
