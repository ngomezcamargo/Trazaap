import assert from 'node:assert/strict';
import test from 'node:test';
import { anularDocumentoService, cargarDocumentoService, descargarDocumentoService } from '../src/modulos/documentos/documentos.service.js';

test('RF17 anula el documento sin eliminar su objeto de MinIO', async () => {
  let recibido;
  const result = await anularDocumentoService(7, { sub: 2 }, {
    anularDocumento: async (id, usuarioId) => { recibido = { id, usuarioId }; return { id_documento: id, estado: 'anulado' }; }
  });
  assert.deepEqual(recibido, { id: 7, usuarioId: 2 });
  assert.equal(result.estado, 'anulado');
});

test('RF17 carga el binario en MinIO y guarda solamente sus metadatos en PostgreSQL', async () => {
  const operaciones = [];
  const minio = {
    async putObject(bucket, objeto, buffer, size, metadata) {
      operaciones.push({ operacion: 'put', bucket, objeto, buffer, size, metadata });
    },
    async removeObject(bucket, objeto) {
      operaciones.push({ operacion: 'remove', bucket, objeto });
    }
  };
  const documento = await cargarDocumentoService(
    { tipo_documental: 'Certificado de inocuidad', entidad_emisora: 'Secretaria de Salud', numero_documento: 'QA-17', observaciones: 'Prueba' },
    { originalname: 'certificado.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7 prueba'), size: 16 },
    { sub: 3 },
    {
      asegurarBucketDocumentos: async () => ({ minio, bucket: 'documentos-test' }),
      crearDocumento: async (data) => data
    }
  );
  assert.equal(operaciones.length, 1);
  assert.equal(operaciones[0].operacion, 'put');
  assert.equal(operaciones[0].metadata['Content-Type'], 'application/pdf');
  assert.equal(documento.bucket, 'documentos-test');
  assert.equal(documento.entidad_emisora, 'Secretaria de Salud');
  assert.equal(documento.numero_documento, 'QA-17');
  assert.equal(documento.cargado_por, 3);
  assert.match(documento.objeto_minio, /^\d{4}-\d{2}-\d{2}\/.+\.pdf$/);
});

test('RF17 elimina el objeto de MinIO si falla la persistencia de metadatos', async () => {
  const operaciones = [];
  const minio = {
    async putObject(bucket, objeto) { operaciones.push(['put', bucket, objeto]); },
    async removeObject(bucket, objeto) { operaciones.push(['remove', bucket, objeto]); }
  };
  await assert.rejects(cargarDocumentoService(
    { tipo_documental: 'Acta de inspeccion sanitaria', entidad_emisora: 'INVIMA' },
    { originalname: 'ficha.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7 prueba'), size: 16 },
    { sub: 3 },
    {
      asegurarBucketDocumentos: async () => ({ minio, bucket: 'documentos-test' }),
      crearDocumento: async () => { throw new Error('fallo de PostgreSQL'); }
    }
  ), /fallo de PostgreSQL/);
  assert.equal(operaciones.length, 2);
  assert.equal(operaciones[1][0], 'remove');
});

test('RF17 la descarga solo consulta documentos activos y recupera el binario desde MinIO', async () => {
  let recuperado;
  const stream = { etiqueta: 'stream-minio' };
  const result = await descargarDocumentoService(12, {
    buscarDocumento: async (id) => { recuperado = id; return { id_documento: id, bucket: 'documentos', objeto_minio: '2026-08-20/archivo.pdf', estado: 'activo' }; },
    obtenerClienteMinio: () => ({ getObject: async (bucket, objeto) => { assert.equal(bucket, 'documentos'); assert.equal(objeto, '2026-08-20/archivo.pdf'); return stream; } })
  });
  assert.equal(recuperado, 12);
  assert.equal(result.stream, stream);
});
