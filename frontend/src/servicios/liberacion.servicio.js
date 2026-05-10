import { api } from './api';

export const liberacionServicio = {
  listarPendientes: () => api.get('/liberacion/pendientes'),
  listar: () => api.get('/liberacion'),
  crear: (payload) => api.post('/liberacion', payload)
};
