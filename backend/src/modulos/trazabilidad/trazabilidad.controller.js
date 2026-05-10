import { consultarTrazabilidadPorLote } from './trazabilidad.service.js';

export async function consultarTrazabilidadController(req, res) {
  const trazabilidad = await consultarTrazabilidadPorLote(req.params.lote);
  res.json(trazabilidad);
}
