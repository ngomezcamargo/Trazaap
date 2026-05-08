import crypto from 'crypto';

function ordenarValor(value) {
  if (Array.isArray(value)) return value.map(ordenarValor);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = ordenarValor(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function serializarEstable(value) {
  return JSON.stringify(ordenarValor(value));
}

export function calcularHashEvento(data) {
  const base = {
    codigoLote: data.codigoLote,
    tipoEvento: data.tipoEvento,
    descripcion: data.descripcion,
    responsable: data.responsable,
    fechaEvento: data.fechaEvento,
    datosEvento: data.datosEvento || {},
    hashAnterior: data.hashAnterior || null
  };

  return crypto.createHash('sha256').update(serializarEstable(base)).digest('hex');
}

export function normalizarEventoParaHash(evento) {
  return {
    codigoLote: evento.codigo_lote ?? evento.codigoLote,
    tipoEvento: evento.tipo_evento ?? evento.tipoEvento,
    descripcion: evento.descripcion,
    responsable: evento.responsable,
    fechaEvento: new Date(evento.fecha_evento ?? evento.fechaEvento).toISOString(),
    datosEvento: evento.datos_evento ?? evento.datosEvento ?? {},
    hashAnterior: evento.hash_anterior ?? evento.hashAnterior ?? null
  };
}

export function verificarCadenaHashes(eventos) {
  const errores = [];
  let hashAnteriorEsperado = null;

  for (const evento of eventos) {
    const hashAnterior = evento.hash_anterior ?? evento.hashAnterior ?? null;
    const hashEvento = evento.hash_evento ?? evento.hashEvento;
    const eventId = evento.id ?? evento.eventId;
    const hashRecalculado = calcularHashEvento(normalizarEventoParaHash(evento));

    if (hashAnterior !== hashAnteriorEsperado) {
      errores.push({
        eventId,
        tipo: 'HASH_ANTERIOR_INVALIDO',
        esperado: hashAnteriorEsperado,
        actual: hashAnterior
      });
    }

    if (hashRecalculado !== hashEvento) {
      errores.push({
        eventId,
        tipo: 'HASH_EVENTO_INVALIDO',
        esperado: hashRecalculado,
        actual: hashEvento
      });
    }

    hashAnteriorEsperado = hashEvento;
  }

  return errores;
}
