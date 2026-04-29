import {
  crearInspeccionService,
  crearRecepcionService,
  listarMateriasPrimasService,
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

export async function crearInspeccionController(req, res) {
  const inspeccion = await crearInspeccionService(Number(req.params.id), req.body, req.usuario.email);
  res.status(201).json(inspeccion);
}

export async function listarMateriasPrimasController(req, res) {
  const materiasPrimas = await listarMateriasPrimasService();
  res.json(materiasPrimas);
}
