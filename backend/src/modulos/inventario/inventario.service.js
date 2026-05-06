import { listarInventarioInsumos } from './inventario.repository.js';

export async function listarInventarioInsumosService() {
  return listarInventarioInsumos();
}
