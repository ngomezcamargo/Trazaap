import assert from 'node:assert/strict';
import test from 'node:test';
import { construirDocumentoConsultaEpcis } from '../src/modulos/epcis/epcis.mapper.js';
import { validarContraSchemaOficialEpcis } from '../src/modulos/epcis/epcis.schema-validator.js';

const ejecutar = process.env.RUN_EPCIS_SCHEMA_TESTS === 'true';
const evento = {
  tipo: 'despacho',
  eventTime: '2026-08-18T10:00:00.000Z',
  epcClassUri: 'urn:epc:class:lgtin:0614141.112345.PRUEBA-RNF11',
  readPointUri: 'urn:epc:id:sgln:0614141.12345.0'
};

test('EPCIS valida QueryDocument contra el esquema oficial configurado', { skip: !ejecutar }, () => {
  assert.doesNotThrow(() => validarContraSchemaOficialEpcis(construirDocumentoConsultaEpcis([evento])));
});

test('EPCIS rechaza documento que incumple el esquema oficial', { skip: !ejecutar }, () => {
  assert.throws(() => validarContraSchemaOficialEpcis({ type: 'EPCISDocument' }), (error) => error.status === 400 && error.details.codigo === 'EPCIS_SCHEMA_INVALIDO');
});
