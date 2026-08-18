import { crearEnvasadoService, listarEnvasadosService, listarPendientesEnvasadoService } from './envasado.service.js';
export async function listarEnvasadosController(req,res){res.json(await listarEnvasadosService(req.query.lote || ''));}
export async function listarPendientesController(req,res){res.json(await listarPendientesEnvasadoService());}
export async function crearEnvasadoController(req,res){res.status(201).json(await crearEnvasadoService(req.body,req.usuario));}
