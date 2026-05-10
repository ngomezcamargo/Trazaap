import { api } from './api';

export const proveedoresServicio = {
  listar: () => api.get('/providers'),
  crear: (payload) => api.post('/providers', payload),
  actualizar: (id, payload) => api.put(`/providers/${id}`, payload),
  eliminar: (id) => api.del(`/providers/${id}`)
};
