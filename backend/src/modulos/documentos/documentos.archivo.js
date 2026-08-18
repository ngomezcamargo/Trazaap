import path from 'node:path';
import { ErrorHttp } from '../../middlewares/errorHttp.js';

const FORMATOS = {
  'application/pdf': {
    extensiones: new Set(['.pdf']),
    extensionCanonica: '.pdf',
    firma: (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  },
  'image/jpeg': {
    extensiones: new Set(['.jpg', '.jpeg']),
    extensionCanonica: '.jpg',
    firma: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  },
  'image/png': {
    extensiones: new Set(['.png']),
    extensionCanonica: '.png',
    firma: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensiones: new Set(['.xlsx']),
    extensionCanonica: '.xlsx',
    firma: (buffer) => buffer.length >= 4
      && buffer[0] === 0x50 && buffer[1] === 0x4b
      && buffer[2] === 0x03 && buffer[3] === 0x04
      && buffer.includes(Buffer.from('[Content_Types].xml'))
      && buffer.includes(Buffer.from('xl/'))
  }
};

export function nombreSeguroDocumento(nombreOriginal = '') {
  const base = String(nombreOriginal).split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return base.slice(0, 255);
}

export function validarArchivoDocumento(archivo) {
  if (!archivo) throw new ErrorHttp(400, 'Archivo requerido');
  const formato = FORMATOS[archivo.mimetype];
  const nombreSeguro = nombreSeguroDocumento(archivo.originalname);
  const extension = path.extname(nombreSeguro).toLowerCase();
  if (!formato || !formato.extensiones.has(extension) || !Buffer.isBuffer(archivo.buffer) || !formato.firma(archivo.buffer)) {
    throw new ErrorHttp(415, 'Tipo o contenido de archivo no permitido');
  }
  return { nombreSeguro, extension: formato.extensionCanonica };
}
