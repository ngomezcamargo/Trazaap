import {
  crearLiberacionService,
  listarLiberacionesService,
  listarPendientesLiberacionService
} from './liberacion.service.js';

export async function crearLiberacionController(req, res) {
  const liberacion = await crearLiberacionService(req.body, req.usuario);
  res.status(201).json(liberacion);
}

export async function listarPendientesLiberacionController(req, res) {
  const pendientes = await listarPendientesLiberacionService();
  res.json(pendientes);
}

export async function listarLiberacionesController(req, res) {
  const liberaciones = await listarLiberacionesService();
  res.json(liberaciones);
}
