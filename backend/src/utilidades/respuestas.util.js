export function respuestaOk(res, data, status = 200) {
  return res.status(status).json(data);
}

export function respuestaMensaje(res, message, status = 200) {
  return res.status(status).json({ message });
}
