import {
  consultarEventoFabric,
  consultarTrazabilidadPorLote,
  crearEventoTrazabilidadAuditable,
  listarEventosTrazabilidadAuditablePorLote,
  verificarIntegridadLote
} from './trazabilidad.service.js';

export async function consultarTrazabilidadController(req, res) {
  const trazabilidad = await consultarTrazabilidadPorLote(req.params.lote);
  res.json(trazabilidad);
}

export async function crearEventoTrazabilidadController(req, res) {
  const evento = await crearEventoTrazabilidadAuditable(req.body);
  res.status(201).json(evento);
}

export async function listarEventosLoteController(req, res) {
  const resultado = await listarEventosTrazabilidadAuditablePorLote(req.params.codigoLote);
  res.json(resultado);
}

export async function consultarEventoFabricController(req, res) {
  const evidencia = await consultarEventoFabric(req.params.eventId);
  res.json(evidencia);
}

export async function verificarLoteController(req, res) {
  const resultado = await verificarIntegridadLote(req.params.codigoLote);
  res.json(resultado);
}
