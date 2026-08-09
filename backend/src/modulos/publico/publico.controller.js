import {
  confirmarRecepcionClienteService,
  consultarTrazabilidadAuditoria,
  consultarTrazabilidadCliente,
  consultarTrazabilidadPublicaPorLote
} from './publico.service.js';

export async function confirmarRecepcionClienteController(req, res) {
  const resultado = await confirmarRecepcionClienteService(req.body);
  res.status(201).json(resultado);
}

export async function consultarTrazabilidadPublicaController(req, res) {
  const trazabilidad = await consultarTrazabilidadPublicaPorLote(req.params.lote);
  res.json(trazabilidad);
}

export async function consultarTrazabilidadClienteController(req, res) {
  const trazabilidad = await consultarTrazabilidadCliente({
    lote: req.query.lote,
    factura: req.query.factura,
    codigo: req.query.codigo
  });
  res.json(trazabilidad);
}

export async function consultarTrazabilidadAuditoriaController(req, res) {
  const trazabilidad = await consultarTrazabilidadAuditoria({
    lote: req.query.lote,
    codigo: req.query.codigo
  });
  res.json(trazabilidad);
}
