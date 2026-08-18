import { api } from './api';

export const clientesServicio = {
  listar: () => api.get('/clientes'),
  listarTodos: () => api.get('/clientes?todos=true'),
  consultar: (id) => api.get(`/clientes/${id}`),
  crear: (data) => api.post('/clientes', data),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data)
};
