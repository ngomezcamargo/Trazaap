import {
  consultarTrazabilidadPorLote,
  registrarCorreccionTrazabilidad
} from './trazabilidad.service.js';

export async function consultarTrazabilidadController(req, res) {
  const trazabilidad = await consultarTrazabilidadPorLote(req.params.lote);
  res.json(trazabilidad);
}

export async function registrarCorreccionTrazabilidadController(req, res) {
  const correccion = await registrarCorreccionTrazabilidad({
    tipoEvento: req.params.tipoEvento,
    idEntidad: req.params.idEntidad,
    motivo: req.body.motivo,
    actor: req.usuario.email
  });
  res.status(201).json(correccion);
}
