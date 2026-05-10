import { listarInventarioInsumos, listarInventarioProductoTerminado } from './inventario.repository.js';

export async function listarInventarioInsumosService() {
  return listarInventarioInsumos();
}

export async function listarInventarioProductoTerminadoService() {
  return listarInventarioProductoTerminado();
}
