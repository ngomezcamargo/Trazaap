import { api } from './api';
export const documentosServicio = {
  listar: () => api.get('/documentos'),
  cargar: (formData) => api.postForm('/documentos', formData),
  descargar: (id) => api.descargar(`/documentos/${id}/descarga`)
};
