import { entorno } from '../../configuracion/entorno.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { construirDocumentoConsultaEpcis, validarDocumentoCapturaEpcis } from './epcis.mapper.js';
import { auditarInteroperabilidad, consultarEventosEpcisPorLote } from './epcis.repository.js';

function habilitado() { if (!entorno.epcis.enabled) throw new ErrorHttp(503, 'Interoperabilidad EPCIS no habilitada'); }
export async function consultarEpcisPorLote(lote, actor) {
  habilitado();
  try {
    const eventos = await consultarEventosEpcisPorLote(lote);
    const documento = construirDocumentoConsultaEpcis(eventos);
    await auditarInteroperabilidad({ direccion: 'query', actor, cantidadEventos: eventos.length, resultado: 'generado', metadatos: { lote } });
    return documento;
  } catch (error) {
    await auditarInteroperabilidad({ direccion: 'query', actor, cantidadEventos: 0, resultado: 'rechazado', codigoError: error.details?.codigo || 'QUERY_RECHAZADA', metadatos: { lote } }).catch(() => {});
    throw error;
  }
}
export async function capturarDocumentoEpcis(documento, actor) {
  habilitado();
  try {
    const eventos = validarDocumentoCapturaEpcis(documento);
    await auditarInteroperabilidad({ direccion: 'capture', actor, cantidadEventos: eventos.length, resultado: 'aceptado', metadatos: { tipos: [...new Set(eventos.map((evento) => evento.type))] } });
    return { estado: 'VALIDADO_Y_AUDITADO', eventos: eventos.length, mensaje: 'La captura EPCIS no modifica automaticamente la trazabilidad operativa' };
  } catch (error) {
    await auditarInteroperabilidad({ direccion: 'capture', actor, cantidadEventos: 0, resultado: 'rechazado', codigoError: 'DOCUMENTO_INVALIDO' }).catch(() => {});
    throw error;
  }
}
