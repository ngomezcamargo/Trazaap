'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const TraceabilityContract = require('../index');

class MemoryIterator {
  constructor(values) {
    this.values = values;
    this.index = 0;
  }

  async next() {
    if (this.index >= this.values.length) return { done: true };
    const value = this.values[this.index];
    this.index += 1;
    return { done: false, value: { value } };
  }

  async close() {}
}

class MemoryStub {
  constructor() {
    this.state = new Map();
    this.txId = 'tx-1';
    this.timestamp = new Date('2026-08-08T12:00:00.000Z');
  }

  async getState(key) {
    return this.state.get(key) || Buffer.alloc(0);
  }

  async putState(key, value) {
    this.state.set(key, Buffer.from(value));
  }

  createCompositeKey(objectType, attributes) {
    return `\u0000${objectType}\u0000${attributes.join('\u0000')}\u0000`;
  }

  async getStateByPartialCompositeKey(objectType, attributes) {
    const prefix = this.createCompositeKey(objectType, attributes).slice(0, -1);
    const values = [...this.state.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
    return new MemoryIterator(values);
  }

  getTxID() {
    return this.txId;
  }

  getTxTimestamp() {
    const milliseconds = this.timestamp.getTime();
    return {
      seconds: Math.floor(milliseconds / 1000),
      nanos: (milliseconds % 1000) * 1000000
    };
  }

  nextTx(id, isoDate) {
    this.txId = id;
    if (isoDate) this.timestamp = new Date(isoDate);
  }
}

function context() {
  return {
    stub: new MemoryStub(),
    clientIdentity: {
      getMSPID: () => 'Org1MSP',
      getID: () => 'x509::CN=backend::CN=ca-trazaap'
    }
  };
}

async function registrarManufactura(contract, ctx, id = '8', lote = 'LT-001') {
  await contract.registrarEvento(
    ctx,
    'registro_manufactura',
    id,
    lote,
    'operario@trazaap.local',
    '2026-08-08T08:00:00.000Z',
    JSON.stringify({ manufactura: { lote_producido: lote, unidades_producidas: 20 } })
  );
}

function despachoConforme(overrides = {}) {
  return {
    idEntidad: '5',
    idManufactura: '8',
    lote: 'LT-001',
    producto: 'Bagel',
    numeroFactura: 'FAC-100',
    codigoCliente: 'CLI-LT001-ABC',
    fechaVencimiento: '2099-12-31',
    fechaEvento: '2026-08-08T12:00:00.000Z',
    actor: 'operario@trazaap.local',
    estadoLiberacion: 'aprobado',
    unidadesDespachar: 10,
    inventarioDisponible: 20,
    validaciones: {
      etiquetaVerificada: true,
      loteVisible: true,
      fechaVencimientoVisible: true,
      empaqueConforme: true,
      productoBuenEstado: true,
      verificacionEnvase: true
    },
    transporte: {
      conductor: 'Conductor prueba',
      placaVehiculo: 'ABC123',
      limpiezaVehiculo: 'cumple',
      documentacionConductor: 'cumple'
    },
    controlesCriticos: [
      { variable: 'temperatura_horneado', etiqueta: 'Temperatura de horneado', valor: 170, minimo: 165, maximo: 175, cumple: true }
    ],
    ...overrides
  };
}

test('registra un evento nuevo con identidad Fabric', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  const result = JSON.parse(await contract.registrarEvento(
    ctx, 'recepcion_materia_prima', '42', 'MP-001', 'operario', '2026-08-08T10:00:00Z', '{"cantidad":10}'
  ));
  assert.equal(result.estado, 'REGISTRADO');
  assert.equal(result.mspInvocador, 'Org1MSP');
  assert.equal(result.txId, 'tx-1');
});

test('rechaza la sobrescritura de un evento existente', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  await assert.rejects(
    registrarManufactura(contract, ctx),
    /EVENTO_DUPLICADO/
  );
});

test('detecta un registro operativo alterado', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  const result = JSON.parse(await contract.validarEvento(
    ctx,
    'registro_manufactura',
    '8',
    JSON.stringify({ manufactura: { lote_producido: 'LT-001', unidades_producidas: 99 } })
  ));
  assert.equal(result.estado, 'ALTERADO');
  assert.equal(result.valido, false);
});

test('registra una correccion sin modificar el evento original', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  const originalAntes = await ctx.stub.getState('registro_manufactura:8');
  ctx.stub.nextTx('tx-correccion');
  await contract.registrarCorreccionEvento(
    ctx,
    'registro_manufactura',
    '8',
    'Ajuste documentado de unidades',
    'gerente@trazaap.local',
    JSON.stringify({ manufactura: { lote_producido: 'LT-001', unidades_producidas: 21 } })
  );
  const originalDespues = await ctx.stub.getState('registro_manufactura:8');
  const history = JSON.parse(await contract.consultarHistorialEvento(ctx, 'registro_manufactura', '8'));
  assert.deepEqual(originalDespues, originalAntes);
  assert.equal(history.correcciones.length, 1);
  assert.equal(history.correcciones[0].motivoCorreccion, 'Ajuste documentado de unidades');

  const validacion = JSON.parse(await contract.validarEvento(
    ctx,
    'registro_manufactura',
    '8',
    JSON.stringify({ manufactura: { lote_producido: 'LT-001', unidades_producidas: 21 } })
  ));
  assert.equal(validacion.estado, 'VERIFICADO_CORREGIDO');
  assert.equal(validacion.valido, true);
  assert.notEqual(validacion.hashOriginal, validacion.hashBlockchain);
});

test('confirma la recepcion del cliente para un despacho aprobado', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  ctx.stub.nextTx('tx-despacho');
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  ctx.stub.nextTx('tx-confirmacion');
  const result = JSON.parse(await contract.confirmarRecepcionCliente(
    ctx, 'LT-001', 'FAC-100', '', '2026-08-09T14:00:00Z', 'Cliente receptor', 'Recibido conforme'
  ));
  assert.equal(result.confirmado, true);
  assert.equal(result.estado, 'RECIBIDO_POR_CLIENTE');
});

test('impide confirmar dos veces la recepcion del cliente', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  ctx.stub.nextTx('tx-despacho');
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  ctx.stub.nextTx('tx-confirmacion-1');
  await contract.confirmarRecepcionCliente(ctx, 'LT-001', 'FAC-100', '', '2026-08-09T14:00:00Z', 'Cliente', '');
  ctx.stub.nextTx('tx-confirmacion-2');
  await assert.rejects(
    contract.confirmarRecepcionCliente(ctx, 'LT-001', 'FAC-100', '', '2026-08-09T15:00:00Z', 'Cliente', ''),
    /RECEPCION_YA_CONFIRMADA/
  );
});

test('permite y registra un despacho conforme', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  ctx.stub.nextTx('tx-despacho');
  const validation = JSON.parse(await contract.validarDespacho(ctx, JSON.stringify(despachoConforme())));
  const event = JSON.parse(await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme())));
  assert.equal(validation.permitido, true);
  assert.equal(event.estado, 'DESPACHADO');
});

test('bloquea un despacho con control critico fuera de rango', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  const data = despachoConforme({
    controlesCriticos: [
      { variable: 'temperatura_horneado', etiqueta: 'Temperatura de horneado', valor: 190, minimo: 165, maximo: 175, cumple: true }
    ]
  });
  const validation = JSON.parse(await contract.validarDespacho(ctx, JSON.stringify(data)));
  assert.equal(validation.permitido, false);
  assert.match(validation.motivos.join(' '), /Temperatura de horneado/);
  await assert.rejects(contract.registrarDespacho(ctx, JSON.stringify(data)), /DESPACHO_BLOQUEADO/);
});

test('bloquea el despacho de un lote vencido', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await registrarManufactura(contract, ctx);
  const validation = JSON.parse(await contract.validarDespacho(
    ctx,
    JSON.stringify(despachoConforme({ fechaVencimiento: '2026-08-01' }))
  ));
  assert.equal(validation.permitido, false);
  assert.ok(validation.motivos.includes('El lote se encuentra vencido'));
});

test('registra una sola alerta por lote vencido sin despacho', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  const data = {
    lote: 'LT-VENCIDO',
    producto: 'Bagel',
    fechaVencimiento: '2026-08-01',
    unidadesDisponibles: 4,
    fechaDeteccion: '2026-08-08T12:00:00Z'
  };
  await contract.registrarAlertaVencimiento(ctx, JSON.stringify(data));
  ctx.stub.nextTx('tx-alerta-2');
  await assert.rejects(contract.registrarAlertaVencimiento(ctx, JSON.stringify(data)), /ALERTA_DUPLICADA/);
});
