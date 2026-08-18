import {
  consultarDespachoService,
  crearDespachoService,
  listarDespachosService,
  listarInventariosDespachablesService
} from './despachos.service.js';

export async function listarInventariosDespachablesController(req, res) {
  res.json(await listarInventariosDespachablesService());
}

export async function listarDespachosController(req, res) {
  res.json(await listarDespachosService());
}

export async function consultarDespachoController(req, res) {
  res.json(await consultarDespachoService(Number(req.params.id)));
}

export async function crearDespachoController(req, res) {
  res.status(202).json(await crearDespachoService(req.body, req.usuario));
}
