import {
  actualizarUbicacionService,
  crearControlAlmacenamientoService,
  crearIngresoAlmacenamientoService,
  crearUbicacionService,
  listarAlmacenamientosService,
  listarPendientesAlmacenamientoService,
  listarUbicacionesService,
  obtenerAlmacenamientoService,
  registrarSalidaAlmacenamientoService,
  resolverRetencionAlmacenamientoService
} from './almacenamiento.service.js';

export async function listarPendientesController(req, res) {
  res.json(await listarPendientesAlmacenamientoService());
}
export async function listarAlmacenamientosController(req, res) {
  res.json(await listarAlmacenamientosService(req.query.estado || ''));
}
export async function obtenerAlmacenamientoController(req, res) {
  res.json(await obtenerAlmacenamientoService(Number(req.params.id)));
}
export async function crearIngresoController(req, res) {
  res.status(201).json(await crearIngresoAlmacenamientoService(req.body, req.usuario));
}
export async function crearControlController(req, res) {
  res.status(201).json(await crearControlAlmacenamientoService(Number(req.params.id), req.body, req.usuario));
}
export async function registrarSalidaController(req, res) {
  res.json(await registrarSalidaAlmacenamientoService(Number(req.params.id), req.body, req.usuario));
}
export async function resolverRetencionController(req, res) {
  res.json(await resolverRetencionAlmacenamientoService(Number(req.params.id), req.body, req.usuario));
}
export async function listarUbicacionesController(req, res) {
  res.json(await listarUbicacionesService(req.query.todas === 'true'));
}
export async function crearUbicacionController(req, res) {
  res.status(201).json(await crearUbicacionService(req.body));
}
export async function actualizarUbicacionController(req, res) {
  res.json(await actualizarUbicacionService(Number(req.params.id), req.body));
}

