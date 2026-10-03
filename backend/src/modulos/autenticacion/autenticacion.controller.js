import { consultarPerfil, iniciarSesion, listarOperariosService } from './autenticacion.service.js';

export async function iniciarSesionController(req, res) {
  const respuesta = await iniciarSesion(req.body.email, req.body.password);
  res.json(respuesta);
}

export async function perfilController(req, res) {
  const perfil = await consultarPerfil(req.usuario.sub);
  res.json(perfil);
}

export async function listarOperariosController(req, res) {
  const operarios = await listarOperariosService();
  res.json(operarios);
}
