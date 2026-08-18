import * as Minio from 'minio';
import { entorno } from '../../configuracion/entorno.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';

let cliente;
export function obtenerClienteMinio() {
  if (!entorno.minio.enabled) throw new ErrorHttp(503, 'Gestion documental no configurada');
  if (!entorno.minio.accessKey || !entorno.minio.secretKey) throw new ErrorHttp(503, 'Credenciales MinIO no configuradas');
  if (!cliente) cliente = new Minio.Client({ endPoint: entorno.minio.endPoint, port: entorno.minio.port, useSSL: entorno.minio.useSSL, accessKey: entorno.minio.accessKey, secretKey: entorno.minio.secretKey });
  return cliente;
}

export async function asegurarBucketDocumentos() {
  const minio = obtenerClienteMinio(); const bucket = entorno.minio.bucketDocumentos;
  if (!(await minio.bucketExists(bucket))) await minio.makeBucket(bucket);
  return { minio, bucket };
}
