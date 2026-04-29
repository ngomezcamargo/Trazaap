import { crearLiberacionService, listarLiberacionesService } from './liberacion.service.js';

export async function crearLiberacionController(req, res) {
  const liberacion = await crearLiberacionService(req.body, req.usuario.email);
  res.status(201).json(liberacion);
}

export async function listarLiberacionesController(req, res) {
  const liberaciones = await listarLiberacionesService();
  res.json(liberaciones);
}
