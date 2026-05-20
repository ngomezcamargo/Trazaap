import {
  listarInventarioInsumos,
  listarInventarioProductoTerminado,
  listarMovimientosInventario
} from './inventario.repository.js';

export async function listarInventarioInsumosService() {
  return listarInventarioInsumos();
}

export async function listarInventarioProductoTerminadoService() {
  return listarInventarioProductoTerminado();
}

export async function listarMovimientosInventarioService() {
  return listarMovimientosInventario();
}
