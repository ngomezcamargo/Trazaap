import { api } from './api';
export const documentosServicio = {
  listar: (incluirAnulados = false) => api.get(`/documentos${incluirAnulados ? '?incluir_anulados=true' : ''}`),
  cargar: (formData) => api.postForm('/documentos', formData),
  descargar: (id) => api.descargar(`/documentos/${id}/descarga`),
  anular: (id) => api.patch(`/documentos/${id}/anular`)
};
