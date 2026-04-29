import {
  actualizarMateriaPrimaService,
  crearMateriaPrimaService,
  listarMateriasPrimasService
} from './materias_primas.service.js';

export async function listarMateriasPrimasController(req, res) {
  const data = await listarMateriasPrimasService();
  res.json(data);
}

export async function crearMateriaPrimaController(req, res) {
  const creada = await crearMateriaPrimaService(req.body);
  res.status(201).json(creada);
}

export async function actualizarMateriaPrimaController(req, res) {
  const actualizada = await actualizarMateriaPrimaService(Number(req.params.id), req.body);
  res.json(actualizada);
}
