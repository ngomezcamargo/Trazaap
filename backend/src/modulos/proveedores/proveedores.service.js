import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  actualizarProveedor,
  buscarProveedorPorId,
  crearProveedor,
  eliminarProveedor,
  listarProveedores
} from './proveedores.repository.js';

export async function crearProveedorService(data) {
  return crearProveedor(data);
}

export async function listarProveedoresService() {
  return listarProveedores();
}

export async function consultarProveedorService(id) {
  const proveedor = await buscarProveedorPorId(id);
  if (!proveedor) {
    throw new ErrorHttp(404, 'Proveedor no encontrado');
  }

  return proveedor;
}

export async function actualizarProveedorService(id, data) {
  const proveedor = await actualizarProveedor(id, data);
  if (!proveedor) {
    throw new ErrorHttp(404, 'Proveedor no encontrado');
  }

  return proveedor;
}

export async function eliminarProveedorService(id) {
  const eliminado = await eliminarProveedor(id);
  if (!eliminado) {
    throw new ErrorHttp(404, 'Proveedor no encontrado');
  }

  return { message: 'Proveedor eliminado' };
}
