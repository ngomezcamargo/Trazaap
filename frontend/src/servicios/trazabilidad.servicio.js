import { api } from './api';

export const trazabilidadServicio = {
  consultarPorLote: (lote) => api.get(`/traceability/lote/${encodeURIComponent(lote)}`)
};
