export function noEncontrado(req, res) {
  res.status(404).json({ message: 'Recurso no encontrado' });
}
