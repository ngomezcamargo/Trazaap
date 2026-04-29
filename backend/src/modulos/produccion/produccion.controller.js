import {
  asociarMateriasService,
  crearOrdenProduccionService,
  listarOrdenesProduccionService,
  listarRecepcionesAceptadasService,
  registrarMojesService,
  registrarTiemposService
} from './produccion.service.js';

export async function crearOrdenProduccionController(req, res) {
  const orden = await crearOrdenProduccionService(req.body, req.usuario.email);
  res.status(201).json(orden);
}

export async function listarOrdenesProduccionController(req, res) {
  const ordenes = await listarOrdenesProduccionService();
  res.json(ordenes);
}

export async function listarRecepcionesAceptadasController(req, res) {
  const recepciones = await listarRecepcionesAceptadasService();
  res.json(recepciones);
}

export async function asociarMateriasController(req, res) {
  const data = await asociarMateriasService(Number(req.params.id), req.body, req.usuario.email);
  res.status(201).json(data);
}

export async function registrarTiemposController(req, res) {
  const data = await registrarTiemposService(Number(req.params.id), req.body, req.usuario.email);
  res.status(201).json(data);
}

export async function registrarMojesController(req, res) {
  const data = await registrarMojesService(Number(req.params.id), req.body, req.usuario.email);
  res.status(201).json(data);
}
