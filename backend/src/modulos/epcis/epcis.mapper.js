import { entorno } from '../../configuracion/entorno.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';

const PASOS = {
  recepcion: { type: 'ObjectEvent', action: 'ADD', bizStep: 'receiving' },
  envasado: { type: 'ObjectEvent', action: 'OBSERVE', bizStep: 'packing' },
  almacenamiento: { type: 'ObjectEvent', action: 'OBSERVE', bizStep: 'storing' },
  calidad: { type: 'ObjectEvent', action: 'OBSERVE', bizStep: 'inspecting' },
  liberacion: { type: 'ObjectEvent', action: 'OBSERVE', bizStep: 'inspecting' },
  despacho: { type: 'ObjectEvent', action: 'OBSERVE', bizStep: 'shipping' },
  devolucion: { type: 'ObjectEvent', action: 'OBSERVE', bizStep: 'receiving', disposition: 'returned' }
};

function requerido(valor, campo) {
  if (!valor) throw new ErrorHttp(422, 'DATO MAESTRO EPCIS PENDIENTE DE DEFINICION', { codigo: 'DATO_MAESTRO_EPCIS_PENDIENTE', campo });
  return valor;
}

function ubicaciones(evento) {
  return {
    ...(evento.readPointUri ? { readPoint: { id: evento.readPointUri } } : {}),
    ...(evento.bizLocationUri ? { bizLocation: { id: evento.bizLocationUri } } : {})
  };
}

export function mapearEventoEpcis(evento) {
  const comun = { eventTime: new Date(evento.eventTime).toISOString(), eventTimeZoneOffset: evento.timeZoneOffset || entorno.epcis.timeZoneOffset, ...ubicaciones(evento) };
  if (evento.tipo === 'manufactura') {
    const entradas = evento.inputEpcClassUris || [];
    if (!entradas.length) requerido(null, 'inputEpcClassUris');
    return { type: 'TransformationEvent', ...comun, inputQuantityList: entradas.map((epcClass) => ({ epcClass })), outputQuantityList: [{ epcClass: requerido(evento.epcClassUri, 'epcClassUri') }], bizStep: 'commissioning' };
  }
  const semantica = PASOS[evento.tipo];
  if (!semantica) throw new ErrorHttp(422, 'Evento Trazaap sin mapeo EPCIS definido');
  return { ...semantica, ...comun, quantityList: [{ epcClass: requerido(evento.epcClassUri, 'epcClassUri') }] };
}

export function construirDocumentoConsultaEpcis(eventos) {
  return { '@context': [entorno.epcis.contextUrl], type: 'EPCISQueryDocument', schemaVersion: '2.0', creationDate: new Date().toISOString(), epcisBody: { queryResults: { queryName: 'SimpleEventQuery', resultsBody: { eventList: eventos.map(mapearEventoEpcis) } } } };
}

export function validarDocumentoCapturaEpcis(documento) {
  if (!documento || documento.type !== 'EPCISDocument' || documento.schemaVersion !== '2.0' || !Array.isArray(documento['@context'])) throw new ErrorHttp(400, 'Documento EPCIS 2.0 invalido');
  const eventos = documento.epcisBody?.eventList;
  if (!Array.isArray(eventos) || eventos.length === 0 || eventos.length > 500) throw new ErrorHttp(400, 'eventList EPCIS debe contener entre 1 y 500 eventos');
  const tipos = new Set(['ObjectEvent', 'AggregationEvent', 'TransactionEvent', 'TransformationEvent', 'AssociationEvent']);
  for (const evento of eventos) {
    if (!tipos.has(evento?.type) || !evento.eventTime || !evento.eventTimeZoneOffset) throw new ErrorHttp(400, 'Evento EPCIS incompleto o no soportado');
    const identificadores = [...(evento.epcList || []), ...(evento.inputEPCList || []), ...(evento.outputEPCList || []), ...(evento.quantityList || []).map((x) => x.epcClass), ...(evento.inputQuantityList || []).map((x) => x.epcClass), ...(evento.outputQuantityList || []).map((x) => x.epcClass)].filter(Boolean);
    if (!identificadores.length || identificadores.some((id) => typeof id !== 'string' || !/^(urn:|https?:\/\/)/.test(id))) throw new ErrorHttp(400, 'Evento EPCIS sin identificador URI valido');
  }
  return eventos;
}
