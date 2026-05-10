'use strict';

const crypto = require('crypto');
const { Contract } = require('fabric-contract-api');

class TraceabilityContract extends Contract {
  async registrarEvento(ctx, tipoEvento, idEntidad, lote, actor, fechaEvento, payloadJson) {
    this._requireText(tipoEvento, 'tipoEvento');
    this._requireText(idEntidad, 'idEntidad');
    this._requireText(lote, 'lote');
    this._requireText(actor, 'actor');
    this._requireText(fechaEvento, 'fechaEvento');
    this._requireText(payloadJson, 'payload');

    const payload = this._parsePayload(payloadJson);
    const payloadCanonico = this._stable(payload);
    const hashRegistro = this._hashPayload(payloadCanonico);

    const key = this._eventKey(tipoEvento, idEntidad);
    const exists = await this._exists(ctx, key);

    const event = {
      tipoEvento,
      idEntidad,
      lote,
      actor,
      fechaEvento,
      payload: payloadCanonico,
      hashRegistro,
      timestampBlockchain: this._txTimestamp(ctx),
      estado: exists ? 'ACTUALIZADO' : 'REGISTRADO',
      txId: ctx.stub.getTxID()
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(event)));

    const lotIndexKey = ctx.stub.createCompositeKey('lote~tipo~id', [lote, tipoEvento, idEntidad]);
    await ctx.stub.putState(lotIndexKey, Buffer.from(key));

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
        mensaje: 'No existe evidencia blockchain para este evento'
      });
    }

    const event = JSON.parse(data.toString());
    const valido = event.hashRegistro === hashActual;

    return JSON.stringify({
      valido,
      estado: valido ? 'VERIFICADO' : 'ALTERADO',
      mensaje: valido
        ? 'El registro coincide con la evidencia blockchain'
        : 'El registro actual no coincide con la evidencia blockchain',
      hashBlockchain: event.hashRegistro,
      hashActual
    });
  }

  async consultarEvento(ctx, tipoEvento, idEntidad) {
    this._requireText(tipoEvento, 'tipoEvento');
    this._requireText(idEntidad, 'idEntidad');

    const key = this._eventKey(tipoEvento, idEntidad);
    const data = await ctx.stub.getState(key);

    if (!data || data.length === 0) {
      throw new Error(`No existe evidencia blockchain para ${key}`);
    }

    return data.toString();
  }

  async consultarEventosPorLote(ctx, lote) {
    this._requireText(lote, 'lote');

    const iterator = await ctx.stub.getStateByPartialCompositeKey('lote~tipo~id', [lote]);
    const events = [];

    try {
      while (true) {
        const result = await iterator.next();
        if (result.value && result.value.value) {
          const key = result.value.value.toString();
          const eventData = await ctx.stub.getState(key);
          if (eventData && eventData.length > 0) {
            events.push(JSON.parse(eventData.toString()));
          }
        }

        if (result.done) break;
      }
    } finally {
      await iterator.close();
    }

    return JSON.stringify(events);
  }

  async EventExists(ctx, eventId) {
    this._requireText(eventId, 'eventId');
    return this._exists(ctx, eventId);
  }

  async GetTraceabilityEvent(ctx, eventId) {
    this._requireText(eventId, 'eventId');
    const data = await ctx.stub.getState(eventId);
    if (!data || data.length === 0) {
      throw new Error(`No existe evidencia blockchain para ${eventId}`);
    }
    return data.toString();
  }

  async GetEventsByLot(ctx, lote) {
    return this.consultarEventosPorLote(ctx, lote);
  }

  _eventKey(tipoEvento, idEntidad) {
    return `${tipoEvento}:${idEntidad}`;
  }

  async _exists(ctx, key) {
    const data = await ctx.stub.getState(key);
    return data && data.length > 0;
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

  _requireText(value, fieldName) {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${fieldName} es requerido`);
    }
  }
}

module.exports = TraceabilityContract;
