import { api } from './api';

export const proveedoresServicio = {
  listar: () => api.get('/providers'),
  crear: (payload) => api.post('/providers', payload)
};
