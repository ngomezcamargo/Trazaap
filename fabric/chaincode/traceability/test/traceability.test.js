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

async function inicializarInventario(contract, ctx, overrides = {}) {
  const datos = {
    idInventario: '15',
    idLiberacion: '5',
    lote: 'LT-001',
    producto: 'Bagel',
    unidadesLiberadas: 10,
    unidadesDespachadas: 0,
    unidadesDisponibles: 10,
    fechaVencimiento: '2099-12-31',
    estadoLiberacion: 'aprobado',
    actor: 'operario@trazaap.local',
    fechaEvento: '2026-08-08T10:00:00.000Z',
    payload: { tipoEvento: 'inventario_producto_terminado', inventario: { lote: 'LT-001', unidades_liberadas: 10 } },
    ...overrides
  };
  return JSON.parse(await contract.inicializarInventarioProductoTerminado(ctx, JSON.stringify(datos)));
}

function detalleConforme(overrides = {}) {
  return {
    idInventario: '15',
    idLiberacion: '5',
    idManufactura: '8',
    lote: 'LT-001',
    producto: 'Bagel',
    cantidadDespachada: 3,
    fechaVencimiento: '2099-12-31',
    estadoLiberacion: 'aprobado',
    temperaturaMinEsperadaC: 15,
    temperaturaMaxEsperadaC: 25,
    almacenamiento: { idAlmacenamiento: '4', estado: 'liberado', temperaturaSalidaC: 20 },
    controlesCriticos: [
      { variable: 'temperatura_horneado', etiqueta: 'Temperatura de horneado', valor: 170, minimo: 165, maximo: 175 }
    ],
    ...overrides
  };
}

function despachoConforme(overrides = {}) {
  return {
    idEntidad: '20',
    codigoDespacho: 'DES-20260808-000001',
    numeroFactura: 'FAC-100',
    codigoCliente: 'CLI-DES100-ABC',
    cliente: { nombre: 'Cliente Uno', documento: '900100200' },
    fechaEvento: '2026-08-08T12:00:00.000Z',
    actor: 'operario@trazaap.local',
    responsableDespacho: 'operario@trazaap.local',
    temperaturaSalidaC: 20,
    transporte: {
      conductor: 'Conductor prueba',
      placaVehiculo: 'ABC123',
      temperaturaTransporteC: 20,
      limpiezaVehiculo: 'cumple',
      documentacionConductor: 'cumple',
      canalDistribucion: 'directo'
    },
    detalles: [detalleConforme()],
    observaciones: '',
    ...overrides
  };
}

test('registra y valida un evento inmutable con identidad Fabric', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  const event = JSON.parse(await contract.registrarEvento(
    ctx, 'recepcion_materia_prima', '42', 'MP-001', 'operario', '2026-08-08T10:00:00Z', '{"cantidad":10}'
  ));
  assert.equal(event.estado, 'REGISTRADO');
  assert.equal(event.mspInvocador, 'Org1MSP');
  const validation = JSON.parse(await contract.validarEvento(ctx, 'recepcion_materia_prima', '42', '{"cantidad":11}'));
  assert.equal(validation.estado, 'ALTERADO');
});

test('el contrato generico admite envasado y saneamiento sin funciones ad hoc', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  const tipos = [
    ['envasado_embalado', '501', 'LT-ENV-1', { resultado: 'conforme' }],
    ['actividad_saneamiento', '601', 'SANEAMIENTO', { tipo: 'limpieza', resultado: 'conforme' }]
  ];
  for (const [tipo, id, lote, payload] of tipos) {
    const registrado = JSON.parse(await contract.registrarEvento(
      ctx, tipo, id, lote, 'operario@trazaap.local', '2026-08-17T15:00:00Z', JSON.stringify(payload)
    ));
    assert.equal(registrado.estado, 'REGISTRADO');
    const consultado = JSON.parse(await contract.consultarEvento(ctx, tipo, id));
    assert.equal(consultado.tipoEvento, tipo);
    assert.equal(consultado.lote, lote);
    const validacion = JSON.parse(await contract.validarEvento(ctx, tipo, id, JSON.stringify(payload)));
    assert.equal(validacion.estado, 'VERIFICADO');
    ctx.stub.nextTx(`tx-${tipo}`);
  }
});

test('registra una correccion sin modificar el evento original', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await contract.registrarEvento(ctx, 'registro_manufactura', '8', 'LT-001', 'operario', '2026-08-08T08:00:00Z', '{"unidades":20}');
  const original = await ctx.stub.getState('registro_manufactura:8');
  ctx.stub.nextTx('tx-correccion');
  await contract.registrarCorreccionEvento(ctx, 'registro_manufactura', '8', 'Ajuste documentado', 'gerente', '{"unidades":21}');
  assert.deepEqual(await ctx.stub.getState('registro_manufactura:8'), original);
});

test('inicializa una sola vez el saldo de producto terminado', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  const result = await inicializarInventario(contract, ctx);
  assert.equal(result.saldo.unidadesDisponibles, 10);
  const repeated = await inicializarInventario(contract, ctx);
  assert.equal(repeated.idempotente, true);
  await assert.rejects(
    inicializarInventario(contract, ctx, { unidadesLiberadas: 11, unidadesDisponibles: 11 }),
    /INVENTARIO_DUPLICADO/
  );
});

test('un despacho parcial de 3 sobre 10 deja saldo 7', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  ctx.stub.nextTx('tx-despacho-1');
  const event = JSON.parse(await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme())));
  const saldo = JSON.parse(await contract.consultarSaldoInventario(ctx, '15'));
  assert.equal(event.estado, 'DESPACHADO');
  assert.equal(saldo.unidadesDespachadas, 3);
  assert.equal(saldo.unidadesDisponibles, 7);
  assert.equal(saldo.estado, 'DESPACHO_PARCIAL');
});

test('permite varios despachos y clientes para el mismo lote', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  ctx.stub.nextTx('tx-despacho-2');
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme({
    idEntidad: '21',
    codigoDespacho: 'DES-20260808-000002',
    numeroFactura: 'FAC-101',
    codigoCliente: 'CLI-DES101-DEF',
    cliente: { nombre: 'Cliente Dos', documento: '900300400' },
    detalles: [detalleConforme({ cantidadDespachada: 4 })]
  })));
  const saldo = JSON.parse(await contract.consultarSaldoInventario(ctx, '15'));
  const events = JSON.parse(await contract.consultarEventosPorLote(ctx, 'LT-001'));
  assert.equal(saldo.unidadesDisponibles, 3);
  assert.equal(events.filter((item) => item.tipoEvento === 'despacho_producto').length, 2);
});

test('el despacho final cambia el lote a despachado total', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  ctx.stub.nextTx('tx-despacho-final');
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme({
    idEntidad: '22',
    codigoDespacho: 'DES-20260808-000003',
    numeroFactura: 'FAC-102',
    detalles: [detalleConforme({ cantidadDespachada: 7 })]
  })));
  const saldo = JSON.parse(await contract.consultarSaldoInventario(ctx, '15'));
  assert.equal(saldo.unidadesDisponibles, 0);
  assert.equal(saldo.estado, 'DESPACHADO_TOTAL');
});

test('rechaza un despacho cuando el lote no tiene existencias', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme({ detalles: [detalleConforme({ cantidadDespachada: 10 })] })));
  ctx.stub.nextTx('tx-sin-stock');
  const data = despachoConforme({ idEntidad: '23', detalles: [detalleConforme({ cantidadDespachada: 1 })] });
  const validation = JSON.parse(await contract.validarDespacho(ctx, JSON.stringify(data)));
  assert.equal(validation.codigo, 'LOTE_SIN_EXISTENCIAS');
  await assert.rejects(contract.registrarDespacho(ctx, JSON.stringify(data)), /LOTE_SIN_EXISTENCIAS/);
});

test('rechaza solicitar mas unidades de las disponibles', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  ctx.stub.nextTx('tx-stock-insuficiente');
  const data = despachoConforme({ idEntidad: '24', detalles: [detalleConforme({ cantidadDespachada: 8 })] });
  const validation = JSON.parse(await contract.validarDespacho(ctx, JSON.stringify(data)));
  assert.equal(validation.codigo, 'STOCK_INSUFICIENTE');
  await assert.rejects(contract.registrarDespacho(ctx, JSON.stringify(data)), /STOCK_INSUFICIENTE/);
});

test('un despacho puede contener varios lotes', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  ctx.stub.nextTx('tx-inventario-2');
  await inicializarInventario(contract, ctx, { idInventario: '16', idLiberacion: '6', lote: 'LT-002', unidadesLiberadas: 5, unidadesDisponibles: 5 });
  ctx.stub.nextTx('tx-multilote');
  const event = JSON.parse(await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme({
    detalles: [detalleConforme(), detalleConforme({ idInventario: '16', idLiberacion: '6', lote: 'LT-002', cantidadDespachada: 2 })]
  }))));
  assert.deepEqual(event.lotes, ['LT-001', 'LT-002']);
  assert.equal(JSON.parse(await contract.consultarSaldoInventario(ctx, '16')).unidadesDisponibles, 3);
});

test('rechaza reutilizar un id de despacho con informacion diferente', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  ctx.stub.nextTx('tx-duplicado');
  await assert.rejects(
    contract.registrarDespacho(ctx, JSON.stringify(despachoConforme({ numeroFactura: 'OTRA' }))),
    /DESPACHO_DUPLICADO/
  );
});

test('bloquea controles criticos o temperaturas fuera de rango', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  const data = despachoConforme({
    temperaturaSalidaC: 40,
    detalles: [detalleConforme({ controlesCriticos: [{ variable: 'horneado', etiqueta: 'Horneado', valor: 190, minimo: 165, maximo: 175 }] })]
  });
  const validation = JSON.parse(await contract.validarDespacho(ctx, JSON.stringify(data)));
  assert.equal(validation.permitido, false);
  assert.equal(validation.codigo, 'DESPACHO_BLOQUEADO');
});

test('bloquea un lote sin almacenamiento liberado', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  const data = despachoConforme({ detalles: [detalleConforme({ almacenamiento: { estado: 'almacenado' } })] });
  const validation = JSON.parse(await contract.validarDespacho(ctx, JSON.stringify(data)));
  assert.equal(validation.permitido, false);
  assert.match(validation.motivos.join(' '), /no completo almacenamiento/);
});

test('confirma por separado cada despacho del mismo lote', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  ctx.stub.nextTx('tx-despacho-2');
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme({
    idEntidad: '21', numeroFactura: 'FAC-101', codigoCliente: 'CLI-2', detalles: [detalleConforme({ cantidadDespachada: 2 })]
  })));
  ctx.stub.nextTx('tx-confirmacion-1');
  const first = JSON.parse(await contract.confirmarRecepcionCliente(ctx, JSON.stringify({
    idConfirmacion: '30', idDespacho: '20', numeroFactura: 'FAC-100', fechaRecepcion: '2026-08-09T14:00:00Z', actor: 'Cliente Uno', temperaturaEntregaC: 20
  })));
  ctx.stub.nextTx('tx-confirmacion-2');
  const second = JSON.parse(await contract.confirmarRecepcionCliente(ctx, JSON.stringify({
    idConfirmacion: '31', idDespacho: '21', codigoCliente: 'CLI-2', fechaRecepcion: '2026-08-09T15:00:00Z', actor: 'Cliente Dos', temperaturaEntregaC: 20
  })));
  assert.equal(first.estado, 'RECIBIDO_POR_CLIENTE');
  assert.equal(second.estado, 'RECIBIDO_POR_CLIENTE');
});

test('rechaza credenciales de cliente incorrectas y una segunda confirmacion', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  await inicializarInventario(contract, ctx);
  await contract.registrarDespacho(ctx, JSON.stringify(despachoConforme()));
  await assert.rejects(contract.confirmarRecepcionCliente(ctx, JSON.stringify({
    idConfirmacion: '30', idDespacho: '20', numeroFactura: 'MALA', fechaRecepcion: '2026-08-09T14:00:00Z', actor: 'Cliente', temperaturaEntregaC: 20
  })), /CREDENCIALES_CLIENTE_INVALIDAS/);
  await contract.confirmarRecepcionCliente(ctx, JSON.stringify({
    idConfirmacion: '30', idDespacho: '20', numeroFactura: 'FAC-100', fechaRecepcion: '2026-08-09T14:00:00Z', actor: 'Cliente', temperaturaEntregaC: 20
  }));
  await assert.rejects(contract.confirmarRecepcionCliente(ctx, JSON.stringify({
    idConfirmacion: '31', idDespacho: '20', numeroFactura: 'FAC-100', fechaRecepcion: '2026-08-09T15:00:00Z', actor: 'Otro', temperaturaEntregaC: 20
  })), /RECEPCION_YA_CONFIRMADA/);
});

test('registra una sola alerta de vencimiento cuando quedan unidades', async () => {
  const contract = new TraceabilityContract();
  const ctx = context();
  const data = { lote: 'LT-VENCIDO', producto: 'Bagel', fechaVencimiento: '2026-08-01', unidadesDisponibles: 4 };
  await contract.registrarAlertaVencimiento(ctx, JSON.stringify(data));
  await assert.rejects(contract.registrarAlertaVencimiento(ctx, JSON.stringify(data)), /ALERTA_DUPLICADA/);
});
