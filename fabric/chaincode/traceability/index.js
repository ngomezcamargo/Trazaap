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
  INVENTARIO_NO_ENCONTRADO: 'INVENTARIO_NO_ENCONTRADO',
  INVENTARIO_DUPLICADO: 'INVENTARIO_DUPLICADO',
  LOTE_SIN_EXISTENCIAS: 'LOTE_SIN_EXISTENCIAS',
  STOCK_INSUFICIENTE: 'STOCK_INSUFICIENTE',
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

  async inicializarInventarioProductoTerminado(ctx, datosJson) {
    this._requireText(datosJson, 'datosInventario');
    const datos = this._stable(this._parsePayload(datosJson));
    const idInventario = String(datos.idInventario || '');
    const lote = String(datos.lote || '');
    this._requireText(idInventario, 'idInventario');
    this._requireText(lote, 'lote');

    const liberadas = Number(datos.unidadesLiberadas);
    const despachadas = Number(datos.unidadesDespachadas || 0);
    const disponibles = Number(datos.unidadesDisponibles ?? (liberadas - despachadas));
    if (![liberadas, despachadas, disponibles].every(Number.isInteger) || liberadas < 0 || despachadas < 0 || disponibles < 0) {
      throw new Error('Las cantidades del inventario deben ser enteros no negativos');
    }
    if (liberadas !== despachadas + disponibles) {
      throw new Error('El saldo inicial no coincide con las unidades liberadas');
    }

    const saldoKey = this._saldoInventarioKey(idInventario);
    const saldoData = await ctx.stub.getState(saldoKey);
    if (saldoData?.length) {
      const existente = JSON.parse(saldoData.toString());
      const coincide = existente.lote === lote &&
        Number(existente.unidadesLiberadas) === liberadas &&
        Number(existente.unidadesDespachadas) === despachadas &&
        Number(existente.unidadesDisponibles) === disponibles;
      if (!coincide) {
        this._throw(CODIGOS_ERROR.INVENTARIO_DUPLICADO, `El inventario ${idInventario} ya fue inicializado con otro saldo`);
      }
      return JSON.stringify({ evento: existente.evento || null, saldo: existente, idempotente: true });
    }

    const estado = disponibles === 0
      ? 'DESPACHADO_TOTAL'
      : despachadas > 0 ? 'DESPACHO_PARCIAL' : 'DISPONIBLE';
    const saldo = {
      idInventario,
      idLiberacion: String(datos.idLiberacion || ''),
      lote,
      producto: String(datos.producto || ''),
      unidadesLiberadas: liberadas,
      unidadesDespachadas: despachadas,
      unidadesDisponibles: disponibles,
      estado,
      actualizadoEn: this._txTimestamp(ctx),
      txId: ctx.stub.getTxID()
    };

    const eventKey = this._eventKey('inventario_producto_terminado', idInventario);
    const eventData = await ctx.stub.getState(eventKey);
    const event = eventData?.length
      ? JSON.parse(eventData.toString())
      : this._crearEvento(ctx, {
          tipoEvento: 'inventario_producto_terminado',
          idEntidad: idInventario,
          lote,
          actor: String(datos.actor || 'sistema'),
          fechaEvento: String(datos.fechaEvento || this._txTimestamp(ctx)),
          payload: datos.payload || { inventario: { ...datos, estado } },
          estado: 'REGISTRADO'
        });

    if (!eventData?.length) await this._guardarEvento(ctx, eventKey, event);
    await ctx.stub.putState(saldoKey, Buffer.from(JSON.stringify({ ...saldo, evento: eventKey })));
    return JSON.stringify({ evento: event, saldo });
  }

  async consultarSaldoInventario(ctx, idInventario) {
    this._requireText(idInventario, 'idInventario');
    const data = await ctx.stub.getState(this._saldoInventarioKey(idInventario));
    if (!data?.length) {
      this._throw(CODIGOS_ERROR.INVENTARIO_NO_ENCONTRADO, `No existe saldo Fabric para el inventario ${idInventario}`);
    }
    return data.toString();
  }

  async validarDespacho(ctx, datosJson) {
    this._requireText(datosJson, 'datosDespacho');
    const datos = this._stable(this._parsePayload(datosJson));
    return JSON.stringify(await this._evaluarDespacho(ctx, datos));
  }

  async registrarDespacho(ctx, datosJson) {
    this._requireText(datosJson, 'datosDespacho');
    const datos = this._stable(this._parsePayload(datosJson));
    this._requireText(String(datos.idEntidad || ''), 'idEntidad');
    const eventKey = this._eventKey('despacho_producto', String(datos.idEntidad));
    const hashSolicitud = this._hashPayload(datos);
    const existenteData = await ctx.stub.getState(eventKey);
    if (existenteData?.length) {
      const existente = JSON.parse(existenteData.toString());
      if (existente.hashSolicitud === hashSolicitud) return JSON.stringify(existente);
      this._throw(CODIGOS_ERROR.DESPACHO_DUPLICADO, `El despacho ${datos.idEntidad} ya existe con otra informacion`);
    }

    const decision = await this._evaluarDespacho(ctx, datos);

    if (!decision.permitido) {
      this._throw(decision.codigo || CODIGOS_ERROR.DESPACHO_BLOQUEADO, JSON.stringify(decision));
    }

    const saldosResultantes = [];
    for (const evaluado of decision.saldos) {
      const saldoKey = this._saldoInventarioKey(evaluado.idInventario);
      const saldoData = await ctx.stub.getState(saldoKey);
      if (!saldoData?.length) {
        this._throw(CODIGOS_ERROR.INVENTARIO_NO_ENCONTRADO, `No existe saldo para ${evaluado.idInventario}`);
      }
      const saldo = JSON.parse(saldoData.toString());
      const cantidad = Number(evaluado.cantidadDespachada);
      if (Number(saldo.unidadesDisponibles) <= 0) {
        this._throw(CODIGOS_ERROR.LOTE_SIN_EXISTENCIAS, `El lote ${saldo.lote} no tiene unidades disponibles`);
      }
      if (cantidad > Number(saldo.unidadesDisponibles)) {
        this._throw(CODIGOS_ERROR.STOCK_INSUFICIENTE, `El lote ${saldo.lote} solo tiene ${saldo.unidadesDisponibles} unidades disponibles`);
      }
      const unidadesDisponibles = Number(saldo.unidadesDisponibles) - cantidad;
      const unidadesDespachadas = Number(saldo.unidadesDespachadas) + cantidad;
      const actualizado = {
        ...saldo,
        unidadesDisponibles,
        unidadesDespachadas,
        estado: unidadesDisponibles === 0 ? 'DESPACHADO_TOTAL' : 'DESPACHO_PARCIAL',
        actualizadoEn: this._txTimestamp(ctx),
        txId: ctx.stub.getTxID()
      };
      await ctx.stub.putState(saldoKey, Buffer.from(JSON.stringify(actualizado)));
      saldosResultantes.push(actualizado);
    }

    const lotePrincipal = decision.lotes[0];
    const event = this._crearEvento(ctx, {
      tipoEvento: 'despacho_producto',
      idEntidad: String(datos.idEntidad),
      lote: lotePrincipal,
      actor: String(datos.actor || 'sistema'),
      fechaEvento: String(datos.fechaEvento || this._txTimestamp(ctx)),
      payload: {
        despacho: datos,
        decisionChaincode: decision,
        saldosResultantes
      },
      estado: 'DESPACHADO',
      extra: {
        lotes: decision.lotes,
        decisionChaincode: decision,
        hashSolicitud
      }
    });

    await this._guardarEvento(ctx, eventKey, event);
    return JSON.stringify(event);
  }

  async confirmarRecepcionCliente(ctx, datosJson) {
    this._requireText(datosJson, 'datosConfirmacion');
    const datos = this._stable(this._parsePayload(datosJson));
    const idDespacho = String(datos.idDespacho || '');
    const idConfirmacion = String(datos.idConfirmacion || '');
    this._requireText(idDespacho, 'idDespacho');
    this._requireText(idConfirmacion, 'idConfirmacion');
    this._requireText(String(datos.fechaRecepcion || ''), 'fechaRecepcion');
    this._requireText(String(datos.actor || ''), 'actor');
    if (!String(datos.numeroFactura || '').trim() && !String(datos.codigoCliente || '').trim()) {
      throw new Error('numeroFactura o codigoCliente es requerido');
    }

    const dispatchData = await ctx.stub.getState(this._eventKey('despacho_producto', idDespacho));
    if (!dispatchData?.length) {
      this._throw(CODIGOS_ERROR.EVENTO_NO_ENCONTRADO, `No existe el despacho ${idDespacho}`);
    }
    const dispatch = JSON.parse(dispatchData.toString());
    const despacho = dispatch.payload?.despacho || {};
    const facturaLedger = this._normalizeCredential(despacho.numeroFactura || despacho.numero_factura);
    const codigoLedger = this._normalizeCredential(despacho.codigoCliente || despacho.codigo_cliente);
    const facturaValida = Boolean(
      facturaLedger && this._normalizeCredential(datos.numeroFactura) === facturaLedger
    );
    const codigoValido = Boolean(
      codigoLedger && this._normalizeCredential(datos.codigoCliente) === codigoLedger
    );

    if (!facturaValida && !codigoValido) {
      this._throw(CODIGOS_ERROR.CREDENCIALES_CLIENTE_INVALIDAS, 'La factura o el codigo no corresponde al lote');
    }

    const confirmationKey = this._confirmationKey(idDespacho);
    if (await this._exists(ctx, confirmationKey)) {
      const existente = JSON.parse((await ctx.stub.getState(confirmationKey)).toString());
      if (String(existente.payload?.confirmacion?.idConfirmacion) === idConfirmacion) {
        return JSON.stringify(existente);
      }
      this._throw(CODIGOS_ERROR.RECEPCION_YA_CONFIRMADA, `El despacho ${idDespacho} ya fue confirmado por el cliente`);
    }

    const event = this._crearEvento(ctx, {
      tipoEvento: 'confirmacion_recepcion_cliente',
      idEntidad: idDespacho,
      lote: dispatch.lote,
      actor: datos.actor,
      fechaEvento: datos.fechaRecepcion,
      payload: {
        confirmacion: {
          idConfirmacion,
          idDespacho,
          lotes: dispatch.lotes || [dispatch.lote],
          numeroFactura: facturaLedger,
          fechaRecepcion: datos.fechaRecepcion,
          receptor: datos.actor,
          temperaturaEntregaC: Number(datos.temperaturaEntregaC),
          observaciones: String(datos.observaciones || '')
        }
      },
      estado: 'RECIBIDO_POR_CLIENTE',
      extra: {
        lotes: dispatch.lotes || [dispatch.lote],
        confirmado: true,
        fechaConfirmacion: datos.fechaRecepcion
      }
    });

    await this._guardarEvento(ctx, confirmationKey, event);
    return JSON.stringify(event);
  }

  async registrarAlertaVencimiento(ctx, datosJson) {
    this._requireText(datosJson, 'datosAlerta');
    const datos = this._stable(this._parsePayload(datosJson));
    this._requireText(String(datos.lote || ''), 'lote');
    this._requireText(String(datos.producto || ''), 'producto');
    this._requireText(String(datos.fechaVencimiento || ''), 'fechaVencimiento');
    const tipoAlerta = String(datos.tipoAlerta || 'vencido');
    if (!['proximo_vencimiento', 'vencido'].includes(tipoAlerta)) throw new Error('tipoAlerta invalido');

    const alertKey = this._eventKey(`alerta_${tipoAlerta}`, datos.lote);
    if (await this._exists(ctx, alertKey)) {
      this._throw(CODIGOS_ERROR.ALERTA_DUPLICADA, `Ya existe una alerta de vencimiento para ${datos.lote}`);
    }
    const hoy = this._txTimestamp(ctx).slice(0, 10);
    if (tipoAlerta === 'vencido' && String(datos.fechaVencimiento).slice(0, 10) > hoy) {
      this._throw(CODIGOS_ERROR.LOTE_NO_VENCIDO, `El lote ${datos.lote} todavia no esta vencido`);
    }
    if (tipoAlerta === 'proximo_vencimiento' && String(datos.fechaVencimiento).slice(0, 10) <= hoy) {
      throw new Error(`El lote ${datos.lote} ya esta vencido`);
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
          estado: tipoAlerta === 'vencido' ? 'VENCIDO' : 'PROXIMO_VENCIMIENTO',
          tipoAlerta,
          diasAnticipacion: datos.diasAnticipacion == null ? null : Number(datos.diasAnticipacion)
        }
      },
      estado: tipoAlerta === 'vencido' ? 'VENCIDO' : 'PROXIMO_VENCIMIENTO'
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
    const saldos = [];
    let codigo = null;
    const agregarRegla = (regla, cumple, mensaje) => {
      reglas.push({ regla, cumple: Boolean(cumple), mensaje: cumple ? 'Cumple' : mensaje });
      if (!cumple) motivos.push(mensaje);
    };

    const idDespacho = String(datos.idEntidad || '');
    agregarRegla('despacho_identificado', Boolean(idDespacho), 'El identificador del despacho es obligatorio');
    agregarRegla(
      'despacho_no_registrado',
      Boolean(idDespacho && !(await this._exists(ctx, this._eventKey('despacho_producto', idDespacho)))),
      'El despacho ya fue registrado'
    );
    agregarRegla('cliente_identificado', Boolean(String(datos.cliente?.nombre || '').trim()), 'El cliente receptor es obligatorio');
    agregarRegla('factura_registrada', Boolean(String(datos.numeroFactura || '').trim()), 'El numero de factura es obligatorio');
    agregarRegla('conductor_identificado', Boolean(String(datos.transporte?.conductor || '').trim()), 'El conductor es obligatorio');
    agregarRegla('placa_registrada', Boolean(String(datos.transporte?.placaVehiculo || '').trim()), 'La placa del vehiculo es obligatoria');
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

    const detalles = Array.isArray(datos.detalles) ? datos.detalles : [];
    agregarRegla('detalle_registrado', detalles.length > 0, 'El despacho debe contener al menos un lote');
    const idsInventario = detalles.map((detalle) => String(detalle.idInventario || ''));
    agregarRegla(
      'inventarios_no_repetidos',
      new Set(idsInventario).size === idsInventario.length,
      'Un inventario no puede repetirse dentro del mismo despacho'
    );

    const lotes = [];
    for (const detalle of detalles) {
      const idInventario = String(detalle.idInventario || '');
      const lote = String(detalle.lote || '');
      const prefijo = `inventario_${idInventario || 'sin_id'}`;
      if (lote && !lotes.includes(lote)) lotes.push(lote);
      agregarRegla(`${prefijo}_identificado`, Boolean(idInventario), 'El inventario del detalle es obligatorio');

      const saldoData = idInventario
        ? await ctx.stub.getState(this._saldoInventarioKey(idInventario))
        : Buffer.alloc(0);
      const saldo = saldoData?.length ? JSON.parse(saldoData.toString()) : null;
      agregarRegla(`${prefijo}_registrado_fabric`, Boolean(saldo), `No existe saldo Fabric para el inventario ${idInventario}`);
      agregarRegla(`${prefijo}_lote_corresponde`, Boolean(saldo && saldo.lote === lote), `El inventario ${idInventario} no corresponde al lote ${lote}`);
      agregarRegla(`${prefijo}_liberacion_aprobada`, detalle.estadoLiberacion === 'aprobado', `El lote ${lote} no tiene liberacion aprobada`);
      agregarRegla(
        `${prefijo}_almacenamiento_conforme`,
        ['liberado', 'despacho_parcial'].includes(detalle.almacenamiento?.estado),
        `El lote ${lote} no completo almacenamiento y liberacion antes del despacho`
      );

      const cantidad = Number(detalle.cantidadDespachada);
      const disponibles = Number(saldo?.unidadesDisponibles);
      const cantidadValida = Number.isInteger(cantidad) && cantidad > 0;
      agregarRegla(`${prefijo}_cantidad_valida`, cantidadValida, `La cantidad del lote ${lote} debe ser un entero mayor que cero`);
      const tieneExistencias = Boolean(saldo && Number.isFinite(disponibles) && disponibles > 0);
      agregarRegla(`${prefijo}_con_existencias`, tieneExistencias, `El lote ${lote} no tiene productos disponibles`);
      const stockSuficiente = Boolean(tieneExistencias && cantidadValida && cantidad <= disponibles);
      agregarRegla(
        `${prefijo}_stock_suficiente`,
        stockSuficiente,
        `El lote ${lote} solo tiene ${Number.isFinite(disponibles) ? disponibles : 0} unidades disponibles`
      );
      if (!tieneExistencias && saldo) codigo = CODIGOS_ERROR.LOTE_SIN_EXISTENCIAS;
      else if (!stockSuficiente && saldo && cantidadValida) codigo = codigo || CODIGOS_ERROR.STOCK_INSUFICIENTE;

      const fechaVencimiento = String(detalle.fechaVencimiento || '').slice(0, 10);
      const fechaDespacho = String(datos.fechaEvento || this._txTimestamp(ctx)).slice(0, 10);
      agregarRegla(
        `${prefijo}_no_vencido`,
        Boolean(fechaVencimiento && fechaVencimiento >= fechaDespacho),
        `El lote ${lote} se encuentra vencido`
      );

      const minimo = Number(detalle.temperaturaMinEsperadaC);
      const maximo = Number(detalle.temperaturaMaxEsperadaC);
      const temperaturaSalida = Number(datos.temperaturaSalidaC);
      const temperaturaTransporte = Number(datos.transporte?.temperaturaTransporteC);
      const rangoValido = Number.isFinite(minimo) && Number.isFinite(maximo) && minimo <= maximo;
      agregarRegla(
        `${prefijo}_temperatura_salida`,
        Boolean(rangoValido && Number.isFinite(temperaturaSalida) && temperaturaSalida >= minimo && temperaturaSalida <= maximo),
        `La temperatura de salida del lote ${lote} esta fuera del rango ${minimo} - ${maximo} C`
      );
      agregarRegla(
        `${prefijo}_temperatura_transporte`,
        Boolean(rangoValido && Number.isFinite(temperaturaTransporte) && temperaturaTransporte >= minimo && temperaturaTransporte <= maximo),
        `La temperatura de transporte del lote ${lote} esta fuera del rango ${minimo} - ${maximo} C`
      );

      for (const control of Array.isArray(detalle.controlesCriticos) ? detalle.controlesCriticos : []) {
        const valor = Number(control.valor);
        const controlMinimo = Number(control.minimo);
        const controlMaximo = Number(control.maximo);
        const cumple = Number.isFinite(valor) && Number.isFinite(controlMinimo) && Number.isFinite(controlMaximo) &&
          controlMinimo <= controlMaximo && valor >= controlMinimo && valor <= controlMaximo;
        agregarRegla(
          `${prefijo}_control_${control.variable}`,
          cumple,
          `${control.etiqueta || control.variable} del lote ${lote} fuera del rango permitido (${control.minimo} - ${control.maximo})`
        );
      }

      saldos.push({
        idInventario,
        lote,
        cantidadDespachada: cantidad,
        unidadesDisponibles: saldo ? Number(saldo.unidadesDisponibles) : null,
        unidadesDespachadas: saldo ? Number(saldo.unidadesDespachadas) : null
      });
    }

    const motivosUnicos = [...new Set(motivos)];
    return {
      permitido: motivosUnicos.length === 0,
      estado: motivosUnicos.length === 0 ? 'APROBADO' : 'BLOQUEADO',
      codigo: motivosUnicos.length === 0 ? null : codigo || CODIGOS_ERROR.DESPACHO_BLOQUEADO,
      motivos: motivosUnicos,
      reglas,
      lotes,
      saldos,
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
    const lotes = [...new Set((Array.isArray(event.lotes) ? event.lotes : [event.lote]).filter(Boolean))];
    for (const lote of lotes) {
      const lotIndexKey = ctx.stub.createCompositeKey('lote~tipo~id', [
        String(lote),
        event.tipoEvento,
        String(event.idEntidad)
      ]);
      await ctx.stub.putState(lotIndexKey, Buffer.from(key));
    }
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

  _saldoInventarioKey(idInventario) {
    return `saldo_producto_terminado:${idInventario}`;
  }

  _confirmationKey(idDespacho) {
    return `confirmacion_recepcion_cliente:${idDespacho}`;
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
