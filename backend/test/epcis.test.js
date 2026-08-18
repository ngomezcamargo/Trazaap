import assert from 'node:assert/strict';
import test from 'node:test';
import { construirDocumentoConsultaEpcis, mapearEventoEpcis, validarDocumentoCapturaEpcis } from '../src/modulos/epcis/epcis.mapper.js';

const epcSalida = 'urn:epc:class:lgtin:0614141.112345.20260818';
const epcEntrada = 'urn:epc:class:lgtin:0614141.998877.20260801';
const base = { eventTime: '2026-08-18T10:00:00.000Z', epcClassUri: epcSalida, readPointUri: 'urn:epc:id:sgln:0614141.12345.0' };

test('EPCIS mapea recepcion, despacho y devolucion como ObjectEvent con vocabulario CBV', () => {
  assert.deepEqual(['receiving','shipping','receiving'], ['recepcion','despacho','devolucion'].map((tipo) => mapearEventoEpcis({ ...base, tipo }).bizStep));
  assert.equal(mapearEventoEpcis({ ...base, tipo: 'devolucion' }).disposition, 'returned');
});

test('EPCIS representa manufactura como TransformationEvent con entradas y salida configuradas', () => {
  const evento = mapearEventoEpcis({ ...base, tipo: 'manufactura', inputEpcClassUris: [epcEntrada] });
  assert.equal(evento.type, 'TransformationEvent');
  assert.equal(evento.inputQuantityList[0].epcClass, epcEntrada);
  assert.equal(evento.outputQuantityList[0].epcClass, epcSalida);
});

test('EPCIS no inventa identificadores empresariales faltantes', () => {
  assert.throws(() => mapearEventoEpcis({ tipo: 'despacho', eventTime: base.eventTime }), (error) => error.status === 422 && error.details.codigo === 'DATO_MAESTRO_EPCIS_PENDIENTE');
  assert.throws(() => mapearEventoEpcis({ ...base, tipo: 'manufactura', inputEpcClassUris: [] }), (error) => error.status === 422);
});

test('EPCIS genera JSON QueryDocument y valida captura estructural', () => {
  const documento = construirDocumentoConsultaEpcis([{ ...base, tipo: 'despacho' }]);
  assert.equal(documento.type, 'EPCISQueryDocument');
  assert.equal(documento.schemaVersion, '2.0');
  assert.equal(JSON.parse(JSON.stringify(documento)).epcisBody.queryResults.resultsBody.eventList.length, 1);
  const captura = { '@context': documento['@context'], type: 'EPCISDocument', schemaVersion: '2.0', creationDate: base.eventTime, epcisBody: { eventList: [mapearEventoEpcis({ ...base, tipo: 'recepcion' })] } };
  assert.equal(validarDocumentoCapturaEpcis(captura).length, 1);
  assert.throws(() => validarDocumentoCapturaEpcis({ type: 'EPCISDocument' }), (error) => error.status === 400);
});
