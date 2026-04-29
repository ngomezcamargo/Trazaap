import { api } from './api';

export const liberacionServicio = {
  listar: () => api.get('/liberacion'),
  crear: (payload) => api.post('/liberacion', payload)
};
