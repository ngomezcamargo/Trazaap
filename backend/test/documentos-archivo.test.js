import assert from 'node:assert/strict';
import test from 'node:test';
import { nombreSeguroDocumento, validarArchivoDocumento } from '../src/modulos/documentos/documentos.archivo.js';

test('documentos elimina rutas del nombre y conserva solo formatos cuya firma coincide', () => {
  const pdf = {
    originalname: '../../ficha.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\ncontenido')
  };
  assert.deepEqual(validarArchivoDocumento(pdf), { nombreSeguro: 'ficha.pdf', extension: '.pdf' });
  assert.equal(nombreSeguroDocumento('..\\..\\certificado.pdf'), 'certificado.pdf');
});

test('documentos rechaza MIME declarado que no coincide con extension o contenido', () => {
  assert.throws(() => validarArchivoDocumento({
    originalname: 'texto.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('esto no es un PDF')
  }), (error) => error.status === 415);
  assert.throws(() => validarArchivoDocumento({
    originalname: 'imagen.txt',
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  }), (error) => error.status === 415);
});
