import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularHashEvento, verificarCadenaHashes } from '../src/modulos/trazabilidad/trazabilidad.hash.js';

const eventoBase = {
  codigoLote: 'L-2026-001',
  tipoEvento: 'RECEPCION_MATERIA_PRIMA',
  descripcion: 'Recepcion de harina de trigo',
  responsable: 'admin@trazaap.local',
  fechaEvento: '2026-05-06T19:19:36.275Z',
  datosEvento: {
    proveedor: 'Proveedor demo',
    cantidad: 25,
    unidad: 'kg'
  },
  hashAnterior: null
};

test('calcularHashEvento genera el mismo hash para objetos JSON con distinto orden de claves', () => {
  const hashA = calcularHashEvento(eventoBase);
  const hashB = calcularHashEvento({
    ...eventoBase,
    datosEvento: {
      unidad: 'kg',
      cantidad: 25,
      proveedor: 'Proveedor demo'
    }
  });

  assert.equal(hashA, hashB);
});

test('calcularHashEvento cambia si cambia un campo del evento', () => {
  const hashA = calcularHashEvento(eventoBase);
  const hashB = calcularHashEvento({
    ...eventoBase,
    descripcion: 'Recepcion de harina integral'
  });

  assert.notEqual(hashA, hashB);
});

test('verificarCadenaHashes valida hashAnterior entre eventos del mismo lote', () => {
  const hashEvento1 = calcularHashEvento(eventoBase);
  const evento2 = {
    codigoLote: 'L-2026-001',
    tipoEvento: 'CONTROL_CALIDAD',
    descripcion: 'Control de calidad posterior a recepcion',
    responsable: 'admin@trazaap.local',
    fechaEvento: '2026-05-06T19:53:37.655Z',
    datosEvento: {
      resultado: 'aprobado',
      temperatura: 18,
      observaciones: 'Sin hallazgos'
    },
    hashAnterior: hashEvento1
  };
  const hashEvento2 = calcularHashEvento(evento2);

  const errores = verificarCadenaHashes([
    {
      id: 'evento-1',
      codigo_lote: eventoBase.codigoLote,
      tipo_evento: eventoBase.tipoEvento,
      descripcion: eventoBase.descripcion,
      responsable: eventoBase.responsable,
      fecha_evento: eventoBase.fechaEvento,
      datos_evento: eventoBase.datosEvento,
      hash_anterior: eventoBase.hashAnterior,
      hash_evento: hashEvento1
    },
    {
      id: 'evento-2',
      codigo_lote: evento2.codigoLote,
      tipo_evento: evento2.tipoEvento,
      descripcion: evento2.descripcion,
      responsable: evento2.responsable,
      fecha_evento: evento2.fechaEvento,
      datos_evento: evento2.datosEvento,
      hash_anterior: evento2.hashAnterior,
      hash_evento: hashEvento2
    }
  ]);

  assert.deepEqual(errores, []);
});

test('verificarCadenaHashes reporta error si hashAnterior no coincide', () => {
  const hashEvento1 = calcularHashEvento(eventoBase);
  const evento2 = {
    codigoLote: 'L-2026-001',
    tipoEvento: 'CONTROL_CALIDAD',
    descripcion: 'Control de calidad posterior a recepcion',
    responsable: 'admin@trazaap.local',
    fechaEvento: '2026-05-06T19:53:37.655Z',
    datosEvento: { resultado: 'aprobado' },
    hashAnterior: 'hash-invalido'
  };

  const errores = verificarCadenaHashes([
    {
      id: 'evento-1',
      codigo_lote: eventoBase.codigoLote,
      tipo_evento: eventoBase.tipoEvento,
      descripcion: eventoBase.descripcion,
      responsable: eventoBase.responsable,
      fecha_evento: eventoBase.fechaEvento,
      datos_evento: eventoBase.datosEvento,
      hash_anterior: eventoBase.hashAnterior,
      hash_evento: hashEvento1
    },
    {
      id: 'evento-2',
      codigo_lote: evento2.codigoLote,
      tipo_evento: evento2.tipoEvento,
      descripcion: evento2.descripcion,
      responsable: evento2.responsable,
      fecha_evento: evento2.fechaEvento,
      datos_evento: evento2.datosEvento,
      hash_anterior: evento2.hashAnterior,
      hash_evento: calcularHashEvento(evento2)
    }
  ]);

  assert.equal(errores[0].tipo, 'HASH_ANTERIOR_INVALIDO');
  assert.equal(errores[0].esperado, hashEvento1);
  assert.equal(errores[0].actual, 'hash-invalido');
});
