import { consultarTrazabilidadPublicaPorLote } from './publico.service.js';

export async function consultarTrazabilidadPublicaController(req, res) {
  const trazabilidad = await consultarTrazabilidadPublicaPorLote(req.params.lote);
  res.json(trazabilidad);
}
