import { listarInventarioInsumosService, listarInventarioProductoTerminadoService } from './inventario.service.js';

export async function listarInventarioInsumosController(req, res) {
  const inventario = await listarInventarioInsumosService();
  res.json(inventario);
}

export async function listarInventarioProductoTerminadoController(req, res) {
  const inventario = await listarInventarioProductoTerminadoService();
  res.json(inventario);
}
