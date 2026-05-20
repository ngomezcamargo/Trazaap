import { api } from './api';

export const publicoServicio = {
  consultarTrazabilidadPorLote: (lote) => api.get(`/public/traceability/lote/${encodeURIComponent(lote)}`)
};
