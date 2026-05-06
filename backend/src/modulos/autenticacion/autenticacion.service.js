import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { entorno } from '../../configuracion/entorno.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { normalizarRol } from '../../utilidades/roles.util.js';
import { buscarUsuarioPorEmail, buscarUsuarioPorId, listarUsuariosOperarios } from './autenticacion.repository.js';

export async function iniciarSesion(email, password) {
  const usuario = await buscarUsuarioPorEmail(email);

  if (!usuario) {
    throw new ErrorHttp(401, 'Credenciales invalidas');
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordValido) {
    throw new ErrorHttp(401, 'Credenciales invalidas');
  }

  const token = jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      role: normalizarRol(usuario.role)
    },
    entorno.jwtSecret,
    { expiresIn: entorno.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: usuario.id,
      email: usuario.email,
      role: normalizarRol(usuario.role)
    }
  };
}

export async function consultarPerfil(userId) {
  const usuario = await buscarUsuarioPorId(userId);
  if (!usuario) {
    throw new ErrorHttp(404, 'Usuario no encontrado');
  }

  return { ...usuario, role: normalizarRol(usuario.role) };
}

export async function listarOperariosService() {
  const operarios = await listarUsuariosOperarios();
  return operarios.map((usuario) => ({ ...usuario, role: normalizarRol(usuario.role) }));
}
