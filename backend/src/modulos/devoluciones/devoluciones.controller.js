import { crearCasoService, listarCasosService } from './devoluciones.service.js';
export async function listarCasosController(req, res) { res.json(await listarCasosService(req.query.lote || '')); }
export async function crearCasoController(req, res) { res.status(201).json(await crearCasoService(req.body, req.usuario)); }
