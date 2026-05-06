import {
  calcularInsumosRequeridosService,
  crearProductoFabricadoService,
  actualizarCantidadRealMateriaService,
  actualizarEstadoOrdenService,
  asociarMateriasService,
  crearOrdenProduccionService,
  actualizarProductoFabricadoService,
  listarProductosFabricadosService,
  obtenerDetalleOrdenService,
  obtenerDetalleProductoFabricadoService,
  listarOrdenesProduccionService,
  listarRecepcionesAceptadasService,
  registrarTiemposService
} from './produccion.service.js';

export async function crearOrdenProduccionController(req, res) {
  const orden = await crearOrdenProduccionService(req.body, req.usuario.email);
  res.status(201).json(orden);
}

export async function listarOrdenesProduccionController(req, res) {
  const ordenes = await listarOrdenesProduccionService();
  res.json(ordenes);
}

export async function listarRecepcionesAceptadasController(req, res) {
  const recepciones = await listarRecepcionesAceptadasService();
  res.json(recepciones);
}

export async function listarProductosFabricadosController(req, res) {
  const productos = await listarProductosFabricadosService(req.query.q || '');
  res.json(productos);
}

export async function crearProductoFabricadoController(req, res) {
  const producto = await crearProductoFabricadoService(req.body);
  res.status(201).json(producto);
}

export async function actualizarProductoFabricadoController(req, res) {
  const producto = await actualizarProductoFabricadoService(Number(req.params.productoId), req.body);
  res.json(producto);
}

export async function obtenerDetalleProductoFabricadoController(req, res) {
  const producto = await obtenerDetalleProductoFabricadoService(Number(req.params.productoId));
  res.json(producto);
}

export async function calcularInsumosRequeridosController(req, res) {
  const resumen = await calcularInsumosRequeridosService(req.body);
  res.json(resumen);
}

export async function obtenerDetalleOrdenController(req, res) {
  const detalle = await obtenerDetalleOrdenService(Number(req.params.id));
  res.json(detalle);
}

export async function asociarMateriasController(req, res) {
  const data = await asociarMateriasService(Number(req.params.id), req.body, req.usuario.email);
  res.status(201).json(data);
}

export async function registrarTiemposController(req, res) {
  const data = await registrarTiemposService(Number(req.params.id), req.body, req.usuario.email);
  res.status(201).json(data);
}

export async function actualizarEstadoOrdenController(req, res) {
  const data = await actualizarEstadoOrdenService(Number(req.params.id), req.body.estado, req.usuario.email);
  res.json(data);
}

export async function actualizarCantidadRealMateriaController(req, res) {
  const data = await actualizarCantidadRealMateriaService(
    Number(req.params.id),
    Number(req.params.materiaId),
    req.body.cantidad_real,
    req.usuario.email
  );
  res.json(data);
}
