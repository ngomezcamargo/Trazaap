import { actualizarUsuarioService, consultarUsuarioService, crearUsuarioService, listarUsuariosService } from './usuarios.service.js';

export async function listarUsuariosController(req, res) { res.json(await listarUsuariosService()); }
export async function consultarUsuarioController(req, res) { res.json(await consultarUsuarioService(Number(req.params.id))); }
export async function crearUsuarioController(req, res) { res.status(201).json(await crearUsuarioService(req.body)); }
export async function actualizarUsuarioController(req, res) {
  res.json(await actualizarUsuarioService(Number(req.params.id), req.body, req.usuario.sub));
}
