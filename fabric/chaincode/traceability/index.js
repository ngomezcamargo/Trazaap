'use strict';

const { Contract } = require('fabric-contract-api');

class TraceabilityContract extends Contract {
  async EventExists(ctx, eventId) {
    this._requireText(eventId, 'eventId');
    const data = await ctx.stub.getState(this._eventKey(eventId));
    return data && data.length > 0;
  }

  async RegisterTraceabilityEvent(
    ctx,
    eventId,
    codigoLote,
    tipoEvento,
    hashEvento,
    hashAnterior,
    timestamp,
    responsable
  ) {
    this._requireText(eventId, 'eventId');
    this._requireText(codigoLote, 'codigoLote');
    this._requireText(tipoEvento, 'tipoEvento');
    this._requireText(hashEvento, 'hashEvento');
    this._requireText(timestamp, 'timestamp');
    this._requireText(responsable, 'responsable');

    const exists = await this.EventExists(ctx, eventId);
    if (exists) {
      throw new Error(`Traceability event ${eventId} already exists`);
    }

    const event = {
      eventId,
      codigoLote,
      tipoEvento,
      hashEvento,
      hashAnterior: hashAnterior || null,
      timestamp,
      responsable,
      txId: ctx.stub.getTxID()
    };

    await ctx.stub.putState(this._eventKey(eventId), Buffer.from(JSON.stringify(event)));

    const lotIndexKey = ctx.stub.createCompositeKey('lot~timestamp~event', [codigoLote, timestamp, eventId]);
    await ctx.stub.putState(lotIndexKey, Buffer.from(eventId));

    return JSON.stringify(event);
  }

  async GetTraceabilityEvent(ctx, eventId) {
    this._requireText(eventId, 'eventId');
    const data = await ctx.stub.getState(this._eventKey(eventId));
    if (!data || data.length === 0) {
      throw new Error(`Traceability event ${eventId} does not exist`);
    }
    return data.toString();
  }

  async GetEventsByLot(ctx, codigoLote) {
    this._requireText(codigoLote, 'codigoLote');

    const iterator = await ctx.stub.getStateByPartialCompositeKey('lot~timestamp~event', [codigoLote]);
    const events = [];

    try {
      while (true) {
        const result = await iterator.next();
        if (result.value && result.value.value) {
          const eventId = result.value.value.toString();
          const eventData = await ctx.stub.getState(this._eventKey(eventId));
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

  async GetAllEvents(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const events = [];

    try {
      while (true) {
        const result = await iterator.next();
        if (result.value && result.value.key && result.value.key.startsWith('traceabilityEvent:')) {
          events.push(JSON.parse(result.value.value.toString()));
        }

        if (result.done) break;
      }
    } finally {
      await iterator.close();
    }

    return JSON.stringify(events);
  }

  _eventKey(eventId) {
    return `traceabilityEvent:${eventId}`;
  }

  _requireText(value, fieldName) {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }
  }
}

module.exports = TraceabilityContract;
