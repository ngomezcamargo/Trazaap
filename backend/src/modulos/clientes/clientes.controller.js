import {
  actualizarClienteService,
  consultarClienteService,
  crearClienteService,
  listarClientesService
} from './clientes.service.js';

export async function listarClientesController(req, res) {
  const soloActivos = req.query.todos !== 'true';
  res.json(await listarClientesService({ soloActivos }));
}

export async function consultarClienteController(req, res) {
  res.json(await consultarClienteService(Number(req.params.id)));
}

export async function crearClienteController(req, res) {
  res.status(201).json(await crearClienteService(req.body));
}

export async function actualizarClienteController(req, res) {
  res.json(await actualizarClienteService(Number(req.params.id), req.body));
}
