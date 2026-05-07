import crypto from 'crypto';
import { blockchainAdapter } from './blockchain.adapter.js';
import { guardarEventoBlockchain } from './blockchain.repository.js';

function generarHash(evento) {
  return crypto.createHash('sha256').update(JSON.stringify(evento)).digest('hex');
}

async function registrarEvento(evento) {
  const hash = generarHash(evento);
  await blockchainAdapter.registrarEvento(hash, evento);

  return guardarEventoBlockchain({
    tipo_evento: evento.tipoEvento,
    lote: evento.lote,
    hash,
    fecha_evento: evento.fechaEvento,
    usuario: evento.usuario,
    payload_json: evento
  });
}

export async function registrarEventoRecepcion(data) {
  const evento = {
    tipoEvento: 'recepcion_materia_prima',
    fechaEvento: new Date().toISOString(),
    lote: data.lote,
    usuario: data.usuario,
    datosRelevantes: {
      fechaRecepcion: data.fechaRecepcion,
      proveedor: data.proveedor,
      materiaPrima: data.materiaPrima,
      cantidad: Number(data.cantidad),
      presentacion: data.presentacion,
      numeroLote: data.numeroLote,
      temperatura: Number(data.temperaturaRecepcion),
      fechaVencimiento: data.fechaVencimiento,
      recibidoPor: data.recibidoPor,
      inspeccionProducto: data.resultadoInspeccionProducto,
      inspeccionTransporte: data.resultadoInspeccionTransporte,
      estadoRecepcion: data.estadoRecepcion
    }
  };

  return registrarEvento(evento);
}

export async function registrarEventoInspeccion(data) {
  const evento = {
    tipoEvento: 'inspeccion_recepcion',
    fechaEvento: new Date().toISOString(),
    lote: data.lote,
    usuario: data.usuario,
    datosRelevantes: data
  };

  return registrarEvento(evento);
}

export async function registrarEventoProduccion(data) {
  const evento = {
    tipoEvento: data.tipoEvento || 'produccion',
    fechaEvento: new Date().toISOString(),
    lote: data.lote,
    usuario: data.usuario,
    datosRelevantes: {
      responsable: data.responsable,
      productosProducidos: data.productosProducidos || [],
      materiasPrimasUsadas: data.materiasPrimasUsadas || [],
      lotesIngredientes: data.lotesIngredientes || [],
      cantidadesRealesUsadas: data.cantidadesRealesUsadas || [],
      unidadesProducidas: data.unidadesProducidas || [],
      tiemposTemperaturasCriticas: data.tiemposTemperaturasCriticas || []
    }
  };

  return registrarEvento(evento);
}

export async function registrarEventoLiberacion(data) {
  const evento = {
    tipoEvento: 'liberacion_producto',
    fechaEvento: new Date().toISOString(),
    lote: data.lote,
    usuario: data.usuario,
    datosRelevantes: {
      producto: data.producto,
      fechaVencimiento: data.fechaVencimiento,
      unidadesLiberadas: Number(data.unidadesLiberadas),
      pesoNeto: Number(data.pesoNeto),
      estadoLiberacion: data.estadoLiberacion
    }
  };

  return registrarEvento(evento);
}
