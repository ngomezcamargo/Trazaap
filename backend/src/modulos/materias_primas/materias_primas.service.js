import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  actualizarMateriaPrima,
  crearMateriaPrima,
  listarMateriasPrimas
} from './materias_primas.repository.js';

export async function listarMateriasPrimasService() {
  return listarMateriasPrimas();
}

export async function crearMateriaPrimaService(data) {
  return crearMateriaPrima(data);
}

export async function actualizarMateriaPrimaService(id, data) {
  const actualizada = await actualizarMateriaPrima(id, data);
  if (!actualizada) {
    throw new ErrorHttp(404, 'Materia prima no encontrada');
  }

  return actualizada;
}
