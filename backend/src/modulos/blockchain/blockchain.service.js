import crypto from 'crypto';
import { blockchainAdapter } from './blockchain.adapter.js';
import { guardarEventoBlockchain } from './blockchain.repository.js';

function generarHash(evento) {
  return crypto.createHash('sha256').update(JSON.stringify(evento)).digest('hex');
}

function normalizarResultadoInspeccion(valor) {
  if (valor === 'aceptado') return 'aprobado';
  if (valor === 'rechazado') return 'rechazado';
  return 'retenido';
}

function normalizarCumplimiento(valor) {
  if (typeof valor === 'boolean') return valor;

  const limpio = String(valor || '')
    .trim()
    .toLowerCase();

  return ['si', 'true', '1', 'ok', 'cumple', 'aprobado', 'aceptable', 'conforme'].includes(limpio);
}

export async function registrarEventoRecepcion(data) {
  const evento = {
    tipoEvento: 'recepcion_materia_prima',
    fechaEvento: new Date().toISOString(),
    lote: data.lote,
    usuario: data.usuario,
    datosRelevantes: {
      proveedor: data.proveedor,
      materiaPrima: data.materiaPrima,
      cantidad: Number(data.cantidad),
      unidad: data.unidad,
      loteProveedor: data.loteProveedor,
      fechaRecepcion: data.fechaRecepcion,
      fechaVencimiento: data.fechaVencimiento,
      temperaturaRecepcion: Number(data.temperaturaRecepcion),
      pesoRecibido: Number(data.pesoRecibido),
      estadoRecepcion: data.estadoRecepcion
    }
  };

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

export async function registrarEventoInspeccion(data) {
  const evento = {
    tipoEvento: 'inspeccion_recepcion',
    fechaEvento: new Date().toISOString(),
    lote: data.lote,
    usuario: data.usuario,
    datosRelevantes: {
      resultadoInspeccion: normalizarResultadoInspeccion(data.resultadoInspeccion),
      olor: normalizarCumplimiento(data.olor),
      color: normalizarCumplimiento(data.color),
      textura: normalizarCumplimiento(data.textura),
      estadoEmpaque: normalizarCumplimiento(data.estadoEmpaque),
      certificadoCalidad: normalizarCumplimiento(data.certificadoCalidad),
      inspeccionVehiculo: normalizarCumplimiento(data.inspeccionVehiculo),
      observaciones: (data.observaciones || '').trim() || 'sin observaciones'
    }
  };

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
