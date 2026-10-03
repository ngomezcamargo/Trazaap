import crypto from 'node:crypto';
import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { asegurarBucketDocumentos, obtenerClienteMinio } from './minio.client.js';
import { anularDocumento, buscarDocumento, crearDocumento, listarDocumentos } from './documentos.repository.js';
import { validarArchivoDocumento } from './documentos.archivo.js';

export const listarDocumentosService = (f) => listarDocumentos(f);

export async function cargarDocumentoService(data, archivo, usuario, deps = {}) {
  const { nombreSeguro, extension } = validarArchivoDocumento(archivo);
  const { minio, bucket } = await (deps.asegurarBucketDocumentos || asegurarBucketDocumentos)();
  const objeto = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
  await minio.putObject(bucket, objeto, archivo.buffer, archivo.size, { 'Content-Type': archivo.mimetype });
  try {
    return await (deps.crearDocumento || crearDocumento)({
      ...data,
      nombre_original: nombreSeguro,
      objeto_minio: objeto,
      bucket,
      mime_type: archivo.mimetype,
      tamano_bytes: archivo.size,
      cargado_por: usuario.sub
    });
  } catch (error) {
    await minio.removeObject(bucket, objeto).catch(() => {});
    throw error;
  }
}

export async function descargarDocumentoService(id, deps = {}) {
  const documento = await (deps.buscarDocumento || buscarDocumento)(id);
  if (!documento) throw new ErrorHttp(404, 'Documento no encontrado');
  const cliente = deps.obtenerClienteMinio ? deps.obtenerClienteMinio() : obtenerClienteMinio();
  const stream = await cliente.getObject(documento.bucket, documento.objeto_minio);
  return { documento, stream };
}

export async function anularDocumentoService(id, usuario, deps = {}) {
  const documento = await (deps.anularDocumento || anularDocumento)(id, usuario.sub);
  if (!documento) throw new ErrorHttp(404, 'Documento no encontrado o ya anulado');
  return documento;
}
