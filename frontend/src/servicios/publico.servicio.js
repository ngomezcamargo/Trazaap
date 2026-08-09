import { apiPublica } from './api';

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return search.toString();
}

export const publicoServicio = {
  consultarTrazabilidadPorLote: (lote) => apiPublica.get(`/public/traceability/lote/${encodeURIComponent(lote)}`),
  consultarComoCliente: ({ lote, factura, codigo }) => apiPublica.get(`/public/traceability/cliente?${query({ lote, factura, codigo })}`),
  confirmarRecepcion: (payload) => apiPublica.post('/public/traceability/cliente/confirmar', payload),
  consultarComoAuditoria: ({ lote, codigo }) => apiPublica.get(`/public/traceability/auditoria?${query({ lote, codigo })}`)
};
