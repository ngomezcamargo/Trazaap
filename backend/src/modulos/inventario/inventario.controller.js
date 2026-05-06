import { listarInventarioInsumosService } from './inventario.service.js';

export async function listarInventarioInsumosController(req, res) {
  const inventario = await listarInventarioInsumosService();
  res.json(inventario);
}
