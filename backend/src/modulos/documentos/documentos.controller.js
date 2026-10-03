import {
  anularDocumentoService,
  cargarDocumentoService,
  descargarDocumentoService,
  listarDocumentosService
} from './documentos.service.js';

export async function listar(req, res) {
  res.json(await listarDocumentosService({
    incluirAnulados: req.query.incluir_anulados === 'true'
  }));
}

export async function cargar(req, res) {
  res.status(201).json(await cargarDocumentoService(req.body, req.file, req.usuario));
}

export async function descargar(req, res) {
  const { documento, stream } = await descargarDocumentoService(Number(req.params.id));
  res.setHeader('Content-Type', documento.mime_type);
  res.setHeader('Content-Length', documento.tamano_bytes);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(documento.nombre_original)}`);
  stream.on('error', (error) => res.destroy(error));
  stream.pipe(res);
}

export async function anular(req, res) {
  res.json(await anularDocumentoService(Number(req.params.id), req.usuario));
}
