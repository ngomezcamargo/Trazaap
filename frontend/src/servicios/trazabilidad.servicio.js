import { api } from './api';

export const trazabilidadServicio = {
  consultarPorLote: (lote) => api.get(`/traceability/lote/${encodeURIComponent(lote)}`),
  crearEvento: (payload) => api.post('/traceability/events', payload),
  listarEventosAuditables: (codigoLote) => api.get(`/traceability/lots/${encodeURIComponent(codigoLote)}/events`),
  consultarEvidenciaFabric: (eventId) => api.get(`/traceability/events/${encodeURIComponent(eventId)}/fabric`),
  verificarLote: (codigoLote) => api.get(`/traceability/lots/${encodeURIComponent(codigoLote)}/verify`)
};
