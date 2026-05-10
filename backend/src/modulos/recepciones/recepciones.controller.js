import {
  crearRecepcionService,
  listarRecepcionesService,
  obtenerDetalleRecepcionService
} from './recepciones.service.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';

export async function crearRecepcionController(req, res) {
  const recepcion = await crearRecepcionService(req.body, req.usuario.email);
  res.status(201).json(recepcion);
}

export async function listarRecepcionesController(req, res) {
  const recepciones = await listarRecepcionesService();
  res.json(recepciones);
}

export async function obtenerDetalleRecepcionController(req, res) {
  const detalle = await obtenerDetalleRecepcionService(Number(req.params.id));
  if (!detalle) {
    throw new ErrorHttp(404, 'Recepcion no encontrada');
  }

  res.json(detalle);
}
