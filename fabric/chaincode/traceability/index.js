'use strict';

const crypto = require('crypto');
const { Contract } = require('fabric-contract-api');

const CODIGOS_ERROR = {
  EVENTO_DUPLICADO: 'EVENTO_DUPLICADO',
  EVENTO_NO_ENCONTRADO: 'EVENTO_NO_ENCONTRADO',
  LOTE_NO_ENCONTRADO: 'LOTE_NO_ENCONTRADO',
  CREDENCIALES_CLIENTE_INVALIDAS: 'CREDENCIALES_CLIENTE_INVALIDAS',
  RECEPCION_YA_CONFIRMADA: 'RECEPCION_YA_CONFIRMADA',
  DESPACHO_BLOQUEADO: 'DESPACHO_BLOQUEADO',
  DESPACHO_DUPLICADO: 'DESPACHO_DUPLICADO',
  ALERTA_DUPLICADA: 'ALERTA_DUPLICADA',
  LOTE_NO_VENCIDO: 'LOTE_NO_VENCIDO'
};

class TraceabilityContract extends Contract {
  async registrarEvento(ctx, tipoEvento, idEntidad, lote, actor, fechaEvento, payloadJson) {
    this._requireText(tipoEvento, 'tipoEvento');
    this._requireText(idEntidad, 'idEntidad');
    this._requireText(lote, 'lote');
    this._requireText(actor, 'actor');
    this._requireText(fechaEvento, 'fechaEvento');
    this._requireText(payloadJson, 'payload');

    const key = this._eventKey(tipoEvento, idEntidad);
    if (await this._exists(ctx, key)) {
      this._throw(CODIGOS_ERROR.EVENTO_DUPLICADO, `El evento ${key} ya existe y no puede sobrescribirse`);
    }

    const event = this._crearEvento(ctx, {
      tipoEvento,
      idEntidad,
      lote,
      actor,
      fechaEvento,
      payload: this._parsePayload(payloadJson),
      estado: 'REGISTRADO'
    });

    await this._guardarEvento(ctx, key, event);
    return JSON.stringify(event);
  }

  async validarEvento(ctx, tipoEvento, idEntidad, payloadActualJson) {
    this._requireText(tipoEvento, 'tipoEvento');
    this._requireText(idEntidad, 'idEntidad');
    this._requireText(payloadActualJson, 'payloadActual');

    const key = this._eventKey(tipoEvento, idEntidad);
    const data = await ctx.stub.getState(key);
    const payloadActual = this._stable(this._parsePayload(payloadActualJson));
    const hashActual = this._hashPayload(payloadActual);

    if (!data || data.length === 0) {
      return JSON.stringify({
        valido: false,
        estado: 'NO_ENCONTRADO',
        mensaje: 'No existe evidencia blockchain para este evento',
        hashActual
      });
    }

    const event = JSON.parse(data.toString());
    const valido = event.hashRegistro === hashActual;

    if (!valido) {
      const correcciones = await this._obtenerCorreccionesEvento(ctx, tipoEvento, idEntidad);
      const ultimaCorreccion = correcciones.at(-1);
      const payloadCorregido = ultimaCorreccion?.payload?.payloadCorregido;
      const hashCorregido = payloadCorregido ? this._hashPayload(this._stable(payloadCorregido)) : null;

      if (hashCorregido === hashActual) {
        return JSON.stringify({
          valido: true,
          estado: 'VERIFICADO_CORREGIDO',
          mensaje: 'El registro coincide con la ultima correccion inmutable autorizada',
          hashBlockchain: hashCorregido,
          hashOriginal: event.hashRegistro,
          hashActual,
          txId: ultimaCorreccion.txId || null,
          timestampBlockchain: ultimaCorreccion.timestampBlockchain || null,
          motivoCorreccion: ultimaCorreccion.motivoCorreccion || null
        });
      }
    }

    return JSON.stringify({
      valido,
      estado: valido ? 'VERIFICADO' : 'ALTERADO',
      mensaje: valido
        ? 'El registro coincide con la evidencia blockchain'
        : 'El registro actual no coincide con la evidencia blockchain',
      hashBlockchain: event.hashRegistro,
      hashActual,
      txId: event.txId || null,
      timestampBlockchain: event.timestampBlockchain || null
    });
  }

  async registrarCorreccionEvento(
    ctx,
    tipoEventoOriginal,
    idEntidadOriginal,
    motivoCorreccion,
    actor,
    payloadCorregidoJson
  ) {
    this._requireText(tipoEventoOriginal, 'tipoEventoOriginal');
    this._requireText(idEntidadOriginal, 'idEntidadOriginal');
    this._requireText(motivoCorreccion, 'motivoCorreccion');
    this._requireText(actor, 'actor');
    this._requireText(payloadCorregidoJson, 'payloadCorregido');

    const originalKey = this._eventKey(tipoEventoOriginal, idEntidadOriginal);
    const originalData = await ctx.stub.getState(originalKey);
    if (!originalData || originalData.length === 0) {
      this._throw(CODIGOS_ERROR.EVENTO_NO_ENCONTRADO, `No existe el evento original ${originalKey}`);
    }

    const original = JSON.parse(originalData.toString());
    const txId = ctx.stub.getTxID();
    const idCorreccion = `${tipoEventoOriginal}:${idEntidadOriginal}:${txId}`;
    const correctionKey = this._eventKey('correccion_evento', idCorreccion);
    const payloadCorregido = this._stable(this._parsePayload(payloadCorregidoJson));
    const correction = this._crearEvento(ctx, {
      tipoEvento: 'correccion_evento',
      idEntidad: idCorreccion,
      lote: original.lote,
      actor,
      fechaEvento: this._txTimestamp(ctx),
      payload: {
        tipoEventoOriginal,
        idEntidadOriginal,
        motivoCorreccion,
        payloadCorregido
      },
      estado: 'CORRECCION_REGISTRADA',
      extra: {
        tipoEventoOriginal,
        idEntidadOriginal,
        motivoCorreccion,
        hashOriginal: original.hashRegistro,
        hashPayloadCorregido: this._hashPayload(payloadCorregido)
      }
    });

    await this._guardarEvento(ctx, correctionKey, correction);
    const historyKey = ctx.stub.createCompositeKey('historial~tipo~id~tx', [
      tipoEventoOriginal,
      idEntidadOriginal,
      txId
    ]);
    await ctx.stub.putState(historyKey, Buffer.from(correctionKey));

    return JSON.stringify(correction);
  }

  async consultarHistorialEvento(ctx, tipoEvento, idEntidad) {
    this._requireText(tipoEvento, 'tipoEvento');
    this._requireText(idEntidad, 'idEntidad');

    const originalKey = this._eventKey(tipoEvento, idEntidad);
    const originalData = await ctx.stub.getState(originalKey);
    if (!originalData || originalData.length === 0) {
      this._throw(CODIGOS_ERROR.EVENTO_NO_ENCONTRADO, `No existe el evento original ${originalKey}`);
    }

    const correcciones = await this._obtenerCorreccionesEvento(ctx, tipoEvento, idEntidad);
    return JSON.stringify({
      original: JSON.parse(originalData.toString()),
      correcciones
    });
  }

  async validarDespacho(ctx, datosJson) {
    this._requireText(datosJson, 'datosDespacho');
    const datos = this._stable(this._parsePayload(datosJson));
    return JSON.stringify(await this._evaluarDespacho(ctx, datos));
  }

  async registrarDespacho(ctx, datosJson) {
    this._requireText(datosJson, 'datosDespacho');
    const datos = this._stable(this._parsePayload(datosJson));
    const decision = await this._evaluarDespacho(ctx, datos);

    if (!decision.permitido) {
      this._throw(CODIGOS_ERROR.DESPACHO_BLOQUEADO, JSON.stringify(decision));
    }

    this._requireText(String(datos.idEntidad || ''), 'idEntidad');
    const eventKey = this._eventKey('despacho_producto', String(datos.idEntidad));
    if (await this._exists(ctx, eventKey) || await this._exists(ctx, this._dispatchKey(datos.lote))) {
      this._throw(CODIGOS_ERROR.DESPACHO_DUPLICADO, `El lote ${datos.lote} ya fue despachado`);
    }

    const event = this._crearEvento(ctx, {
      tipoEvento: 'despacho_producto',
      idEntidad: String(datos.idEntidad),
      lote: datos.lote,
      actor: String(datos.actor || 'sistema'),
      fechaEvento: String(datos.fechaEvento || this._txTimestamp(ctx)),
      payload: {
        despacho: datos,
        decisionChaincode: decision
      },
      estado: 'DESPACHADO',
      extra: {
        decisionChaincode: decision
      }
    });

    await this._guardarEvento(ctx, eventKey, event);
    await ctx.stub.putState(this._dispatchKey(datos.lote), Buffer.from(eventKey));
    return JSON.stringify(event);
  }

  async confirmarRecepcionCliente(
    ctx,
    lote,
    numeroFactura,
    codigoCliente,
    fechaRecepcion,
    actor,
    observaciones = ''
  ) {
    this._requireText(lote, 'lote');
    this._requireText(fechaRecepcion, 'fechaRecepcion');
    this._requireText(actor, 'actor');
    if (!String(numeroFactura || '').trim() && !String(codigoCliente || '').trim()) {
      throw new Error('numeroFactura o codigoCliente es requerido');
    }

    const events = await this._obtenerEventosPorLote(ctx, lote);
    if (!events.length) {
      this._throw(CODIGOS_ERROR.LOTE_NO_ENCONTRADO, `No existe evidencia blockchain para el lote ${lote}`);
    }

    const dispatch = events.find((item) => item.tipoEvento === 'despacho_producto');
    const release = events.find((item) => (
      item.tipoEvento === 'liberacion_producto' &&
      item.payload?.liberacion?.estado_liberacion === 'aprobado'
    ));
    const source = dispatch || release;
    if (!source) {
      this._throw(CODIGOS_ERROR.DESPACHO_BLOQUEADO, 'El lote no tiene liberacion o despacho aprobado');
    }

    const dispatchData = source.payload?.despacho || source.payload?.liberacion || {};
    const facturaLedger = this._normalizeCredential(dispatchData.numeroFactura || dispatchData.numero_factura);
    const codigoLedger = this._normalizeCredential(dispatchData.codigoCliente || dispatchData.codigo_cliente);
    const facturaValida = Boolean(
      facturaLedger && this._normalizeCredential(numeroFactura) === facturaLedger
    );
    const codigoValido = Boolean(
      codigoLedger && this._normalizeCredential(codigoCliente) === codigoLedger
    );

    if (!facturaValida && !codigoValido) {
      this._throw(CODIGOS_ERROR.CREDENCIALES_CLIENTE_INVALIDAS, 'La factura o el codigo no corresponde al lote');
    }

    const confirmationKey = this._eventKey('confirmacion_recepcion_cliente', lote);
    if (await this._exists(ctx, confirmationKey)) {
      this._throw(CODIGOS_ERROR.RECEPCION_YA_CONFIRMADA, `El lote ${lote} ya fue confirmado por el cliente`);
    }

    const event = this._crearEvento(ctx, {
      tipoEvento: 'confirmacion_recepcion_cliente',
      idEntidad: lote,
      lote,
      actor,
      fechaEvento: fechaRecepcion,
      payload: {
        confirmacion: {
          lote,
          numeroFactura: facturaLedger,
          fechaRecepcion,
          receptor: actor,
          observaciones: String(observaciones || '')
        }
      },
      estado: 'RECIBIDO_POR_CLIENTE',
      extra: {
        confirmado: true,
        fechaConfirmacion: fechaRecepcion
      }
    });

    await this._guardarEvento(ctx, confirmationKey, event);
    return JSON.stringify({
      confirmado: true,
      estado: event.estado,
      lote,
      fechaConfirmacion: fechaRecepcion,
      txId: event.txId
    });
  }

  async registrarAlertaVencimiento(ctx, datosJson) {
    this._requireText(datosJson, 'datosAlerta');
    const datos = this._stable(this._parsePayload(datosJson));
    this._requireText(String(datos.lote || ''), 'lote');
    this._requireText(String(datos.producto || ''), 'producto');
    this._requireText(String(datos.fechaVencimiento || ''), 'fechaVencimiento');

    const alertKey = this._eventKey('alerta_vencimiento', datos.lote);
    if (await this._exists(ctx, alertKey)) {
      this._throw(CODIGOS_ERROR.ALERTA_DUPLICADA, `Ya existe una alerta de vencimiento para ${datos.lote}`);
    }
    if (await this._exists(ctx, this._dispatchKey(datos.lote))) {
      this._throw(CODIGOS_ERROR.DESPACHO_DUPLICADO, `El lote ${datos.lote} ya fue despachado`);
    }

    const hoy = this._txTimestamp(ctx).slice(0, 10);
    if (String(datos.fechaVencimiento).slice(0, 10) > hoy) {
      this._throw(CODIGOS_ERROR.LOTE_NO_VENCIDO, `El lote ${datos.lote} todavia no esta vencido`);
    }
    if (Number(datos.unidadesDisponibles) <= 0) {
      throw new Error('unidadesDisponibles debe ser mayor que cero');
    }

    const event = this._crearEvento(ctx, {
      tipoEvento: 'alerta_vencimiento',
      idEntidad: datos.lote,
      lote: datos.lote,
      actor: String(datos.actor || 'tarea_programada'),
      fechaEvento: String(datos.fechaDeteccion || this._txTimestamp(ctx)),
      payload: {
        alerta: {
          lote: datos.lote,
          producto: datos.producto,
          fechaVencimiento: datos.fechaVencimiento,
          unidadesDisponibles: Number(datos.unidadesDisponibles),
          fechaDeteccion: String(datos.fechaDeteccion || this._txTimestamp(ctx)),
          estado: 'VENCIDO_SIN_DESPACHO'
        }
      },
      estado: 'VENCIDO_SIN_DESPACHO'
    });

    await this._guardarEvento(ctx, alertKey, event);
    return JSON.stringify(event);
  }

  async consultarEvento(ctx, tipoEvento, idEntidad) {
    this._requireText(tipoEvento, 'tipoEvento');
    this._requireText(idEntidad, 'idEntidad');

    const key = this._eventKey(tipoEvento, idEntidad);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) {
      this._throw(CODIGOS_ERROR.EVENTO_NO_ENCONTRADO, `No existe evidencia blockchain para ${key}`);
    }
    return data.toString();
  }

  async consultarEventosPorLote(ctx, lote) {
    this._requireText(lote, 'lote');
    return JSON.stringify(await this._obtenerEventosPorLote(ctx, lote));
  }

  async EventExists(ctx, eventId) {
    this._requireText(eventId, 'eventId');
    return this._exists(ctx, eventId);
  }

  async GetTraceabilityEvent(ctx, eventId) {
    this._requireText(eventId, 'eventId');
    const data = await ctx.stub.getState(eventId);
    if (!data || data.length === 0) {
      this._throw(CODIGOS_ERROR.EVENTO_NO_ENCONTRADO, `No existe evidencia blockchain para ${eventId}`);
    }
    return data.toString();
  }

  async GetEventsByLot(ctx, lote) {
    return this.consultarEventosPorLote(ctx, lote);
  }

  async _evaluarDespacho(ctx, datos) {
    const motivos = [];
    const reglas = [];
    const agregarRegla = (regla, cumple, mensaje) => {
      reglas.push({ regla, cumple: Boolean(cumple), mensaje: cumple ? 'Cumple' : mensaje });
      if (!cumple) motivos.push(mensaje);
    };

    const lote = String(datos.lote || '');
    const idManufactura = String(datos.idManufactura || '');
    const manufacturaData = idManufactura
      ? await ctx.stub.getState(this._eventKey('registro_manufactura', idManufactura))
      : Buffer.alloc(0);
    const manufactura = manufacturaData?.length ? JSON.parse(manufacturaData.toString()) : null;
    agregarRegla('manufactura_registrada', Boolean(
      manufactura
    ), 'No existe evidencia Fabric de la manufactura asociada');
    agregarRegla(
      'manufactura_corresponde_lote',
      Boolean(manufactura && manufactura.lote === lote),
      'La manufactura indicada no corresponde al lote que se intenta despachar'
    );
    agregarRegla(
      'lote_no_despachado',
      Boolean(lote && !(await this._exists(ctx, this._dispatchKey(lote)))),
      'El lote ya fue despachado previamente'
    );
    agregarRegla(
      'estado_aprobado',
      datos.estadoLiberacion === 'aprobado',
      `El estado de liberacion ${datos.estadoLiberacion || 'no informado'} no permite despacho`
    );
    agregarRegla('factura_registrada', Boolean(String(datos.numeroFactura || '').trim()), 'El numero de factura es obligatorio');
    agregarRegla('conductor_identificado', Boolean(String(datos.transporte?.conductor || '').trim()), 'El conductor es obligatorio');
    agregarRegla('placa_registrada', Boolean(String(datos.transporte?.placaVehiculo || '').trim()), 'La placa del vehiculo es obligatoria');

    const fechaVencimiento = String(datos.fechaVencimiento || '').slice(0, 10);
    const hoy = this._txTimestamp(ctx).slice(0, 10);
    agregarRegla(
      'lote_no_vencido',
      Boolean(fechaVencimiento && fechaVencimiento >= hoy),
      'El lote se encuentra vencido'
    );

    const validaciones = datos.validaciones || {};
    const nombresValidaciones = {
      etiquetaVerificada: 'La etiqueta no fue verificada',
      loteVisible: 'El lote no es visible',
      fechaVencimientoVisible: 'La fecha de vencimiento no es visible',
      empaqueConforme: 'El empaque no es conforme',
      productoBuenEstado: 'El producto no se encuentra en buen estado',
      verificacionEnvase: 'La verificacion del envase no es conforme'
    };
    for (const [campo, mensaje] of Object.entries(nombresValidaciones)) {
      agregarRegla(campo, validaciones[campo] === true, mensaje);
    }

    agregarRegla(
      'limpieza_vehiculo',
      datos.transporte?.limpiezaVehiculo === 'cumple',
      'La limpieza del vehiculo no cumple'
    );
    agregarRegla(
      'documentacion_conductor',
      datos.transporte?.documentacionConductor === 'cumple',
      'La documentacion y dotacion del conductor no cumple'
    );

    for (const control of Array.isArray(datos.controlesCriticos) ? datos.controlesCriticos : []) {
      const valor = Number(control.valor);
      const minimo = Number(control.minimo);
      const maximo = Number(control.maximo);
      const cumple = Number.isFinite(valor) && Number.isFinite(minimo) && Number.isFinite(maximo) &&
        minimo <= maximo && valor >= minimo && valor <= maximo;
      agregarRegla(
        `control_${control.variable}`,
        cumple,
        `${control.etiqueta || control.variable} fuera del rango permitido (${control.minimo} - ${control.maximo})`
      );
    }

    const disponibles = Number(datos.inventarioDisponible);
    const solicitadas = Number(datos.unidadesDespachar);
    agregarRegla(
      'inventario_suficiente',
      Number.isFinite(disponibles) && Number.isFinite(solicitadas) && solicitadas > 0 && disponibles >= solicitadas,
      'No existe inventario suficiente de producto terminado'
    );

    const motivosUnicos = [...new Set(motivos)];
    return {
      permitido: motivosUnicos.length === 0,
      estado: motivosUnicos.length === 0 ? 'APROBADO' : 'BLOQUEADO',
      motivos: motivosUnicos,
      reglas,
      lote,
      evaluadoEn: this._txTimestamp(ctx)
    };
  }

  _crearEvento(ctx, { tipoEvento, idEntidad, lote, actor, fechaEvento, payload, estado, extra = {} }) {
    const payloadCanonico = this._stable(payload);
    return {
      tipoEvento,
      idEntidad: String(idEntidad),
      lote: String(lote),
      actor: String(actor),
      fechaEvento: String(fechaEvento),
      payload: payloadCanonico,
      hashRegistro: this._hashPayload(payloadCanonico),
      timestampBlockchain: this._txTimestamp(ctx),
      estado,
      txId: ctx.stub.getTxID(),
      ...this._invokerIdentity(ctx),
      ...extra
    };
  }

  async _guardarEvento(ctx, key, event) {
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(event)));
    const lotIndexKey = ctx.stub.createCompositeKey('lote~tipo~id', [
      event.lote,
      event.tipoEvento,
      String(event.idEntidad)
    ]);
    await ctx.stub.putState(lotIndexKey, Buffer.from(key));
  }

  async _obtenerEventosPorLote(ctx, lote) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('lote~tipo~id', [lote]);
    const events = [];
    const seen = new Set();
    try {
      while (true) {
        const result = await iterator.next();
        if (result.value?.value) {
          const key = result.value.value.toString();
          if (!seen.has(key)) {
            const eventData = await ctx.stub.getState(key);
            if (eventData?.length) {
              events.push(JSON.parse(eventData.toString()));
              seen.add(key);
            }
          }
        }
        if (result.done) break;
      }
    } finally {
      await iterator.close();
    }
    events.sort((a, b) => String(a.timestampBlockchain).localeCompare(String(b.timestampBlockchain)));
    return events;
  }

  async _obtenerCorreccionesEvento(ctx, tipoEvento, idEntidad) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('historial~tipo~id~tx', [tipoEvento, idEntidad]);
    const correcciones = [];
    try {
      while (true) {
        const result = await iterator.next();
        if (result.value?.value) {
          const correctionKey = result.value.value.toString();
          const correctionData = await ctx.stub.getState(correctionKey);
          if (correctionData?.length) correcciones.push(JSON.parse(correctionData.toString()));
        }
        if (result.done) break;
      }
    } finally {
      await iterator.close();
    }

    correcciones.sort((a, b) => {
      const porFecha = String(a.timestampBlockchain).localeCompare(String(b.timestampBlockchain));
      return porFecha || String(a.txId).localeCompare(String(b.txId));
    });
    return correcciones;
  }

  _eventKey(tipoEvento, idEntidad) {
    return `${tipoEvento}:${idEntidad}`;
  }

  _dispatchKey(lote) {
    return `despacho~lote:${lote}`;
  }

  async _exists(ctx, key) {
    const data = await ctx.stub.getState(key);
    return Boolean(data && data.length > 0);
  }

  _invokerIdentity(ctx) {
    let mspInvocador = 'DESCONOCIDO';
    let identidadFabric = 'DESCONOCIDA';
    try {
      mspInvocador = ctx.clientIdentity.getMSPID();
      identidadFabric = ctx.clientIdentity.getID();
    } catch {
      // Compatibilidad con contextos de consulta antiguos o pruebas controladas.
    }
    return { mspInvocador, identidadFabric };
  }

  _txTimestamp(ctx) {
    const timestamp = ctx.stub.getTxTimestamp();
    const rawSeconds = timestamp.seconds;
    const seconds = typeof rawSeconds?.toNumber === 'function'
      ? rawSeconds.toNumber()
      : Number(rawSeconds?.low ?? rawSeconds);
    const nanos = Number(timestamp.nanos || 0);
    return new Date((seconds * 1000) + Math.floor(nanos / 1000000)).toISOString();
  }

  _parsePayload(payloadJson) {
    try {
      return JSON.parse(payloadJson);
    } catch (error) {
      throw new Error(`payload no es JSON valido: ${error.message}`);
    }
  }

  _stable(value) {
    if (Array.isArray(value)) return value.map((item) => this._stable(item));
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          if (value[key] !== undefined) acc[key] = this._stable(value[key]);
          return acc;
        }, {});
    }
    return value;
  }

  _hashPayload(payload) {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  _normalizeCredential(value) {
    return String(value || '').trim().toUpperCase();
  }

  _requireText(value, fieldName) {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${fieldName} es requerido`);
    }
  }

  _throw(code, message) {
    throw new Error(`[${code}] ${message}`);
  }
}

module.exports = TraceabilityContract;
