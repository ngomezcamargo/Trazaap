import bcrypt from 'bcryptjs';
import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  actualizarUsuario,
  buscarUsuarioGestion,
  buscarUsuarioGestionPorEmail,
  crearUsuario,
  listarUsuarios
} from './usuarios.repository.js';

export const listarUsuariosService = () => listarUsuarios();

export async function consultarUsuarioService(id) {
  const usuario = await buscarUsuarioGestion(id);
  if (!usuario) throw new ErrorHttp(404, 'Usuario no encontrado');
  return usuario;
}

export async function crearUsuarioService(data) {
  if (await buscarUsuarioGestionPorEmail(data.email)) {
    throw new ErrorHttp(409, 'Ya existe un usuario con ese correo');
  }
  const passwordHash = await bcrypt.hash(data.password, 12);
  return crearUsuario({ ...data, passwordHash });
}

export async function actualizarUsuarioService(id, data, actorId) {
  const existenteEmail = await buscarUsuarioGestionPorEmail(data.email);
  if (existenteEmail && Number(existenteEmail.id) !== Number(id)) {
    throw new ErrorHttp(409, 'Ya existe otro usuario con ese correo');
  }
  if (Number(id) === Number(actorId) && !data.is_active) {
    throw new ErrorHttp(409, 'No puedes desactivar tu propia cuenta');
  }
  const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;
  try {
    const usuario = await actualizarUsuario(id, { ...data, passwordHash });
    if (!usuario) throw new ErrorHttp(404, 'Usuario no encontrado');
    return usuario;
  } catch (error) {
    if (error.message === 'ULTIMO_ADMINISTRADOR') {
      throw new ErrorHttp(409, 'Debe permanecer al menos un administrador activo');
    }
    throw error;
  }
}
