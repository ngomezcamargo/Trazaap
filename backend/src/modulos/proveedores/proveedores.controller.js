import {
  actualizarProveedorService,
  consultarProveedorService,
  crearProveedorService,
  eliminarProveedorService,
  listarProveedoresService
} from './proveedores.service.js';

export async function crearProveedorController(req, res) {
  const proveedor = await crearProveedorService(req.body);
  res.status(201).json(proveedor);
}

export async function listarProveedoresController(req, res) {
  const proveedores = await listarProveedoresService();
  res.json(proveedores);
}

export async function consultarProveedorController(req, res) {
  const proveedor = await consultarProveedorService(Number(req.params.id));
  res.json(proveedor);
}

export async function actualizarProveedorController(req, res) {
  const proveedor = await actualizarProveedorService(Number(req.params.id), req.body);
  res.json(proveedor);
}

export async function eliminarProveedorController(req, res) {
  const respuesta = await eliminarProveedorService(Number(req.params.id));
  res.json(respuesta);
}
