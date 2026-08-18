import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  actualizarCliente,
  buscarClientePorDocumento,
  buscarClientePorId,
  crearCliente,
  listarClientes
} from './clientes.repository.js';

export function listarClientesService(opciones) {
  return listarClientes(opciones);
}

export async function consultarClienteService(id) {
  const cliente = await buscarClientePorId(id);
  if (!cliente) throw new ErrorHttp(404, 'Cliente no encontrado');
  return cliente;
}

export async function crearClienteService(data) {
  if (await buscarClientePorDocumento(data.nit_documento)) {
    throw new ErrorHttp(409, 'Ya existe un cliente con ese NIT o documento');
  }
  return crearCliente(data);
}

export async function actualizarClienteService(id, data) {
  const existente = await buscarClientePorDocumento(data.nit_documento);
  if (existente && Number(existente.id_cliente) !== Number(id)) {
    throw new ErrorHttp(409, 'Ya existe otro cliente con ese NIT o documento');
  }
  const cliente = await actualizarCliente(id, data);
  if (!cliente) throw new ErrorHttp(404, 'Cliente no encontrado');
  return cliente;
}
