import {
  listarInventarioInsumosService,
  listarInventarioProductoTerminadoService,
  listarMovimientosInventarioService
} from './inventario.service.js';

export async function listarInventarioInsumosController(req, res) {
  const inventario = await listarInventarioInsumosService();
  res.json(inventario);
}

export async function listarInventarioProductoTerminadoController(req, res) {
  const inventario = await listarInventarioProductoTerminadoService();
  res.json(inventario);
}

export async function listarMovimientosInventarioController(req, res) {
  const movimientos = await listarMovimientosInventarioService();
  res.json(movimientos);
}
