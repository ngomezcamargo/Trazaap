import {
  crearRecepcionService,
  listarRecepcionesService
} from './recepciones.service.js';

export async function crearRecepcionController(req, res) {
  const recepcion = await crearRecepcionService(req.body, req.usuario.email);
  res.status(201).json(recepcion);
}

export async function listarRecepcionesController(req, res) {
  const recepciones = await listarRecepcionesService();
  res.json(recepciones);
}
