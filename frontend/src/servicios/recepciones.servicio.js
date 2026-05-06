import { api } from './api';

export const recepcionesServicio = {
  listar: () => api.get('/receptions'),
  crear: (payload) => api.post('/receptions', payload),
  obtenerDetalle: (id) => api.get(`/receptions/${id}/detalle`)
};
