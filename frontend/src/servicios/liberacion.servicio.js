import { api } from './api';

export const liberacionServicio = {
  listarPendientes: () => api.get('/liberacion/pendientes'),
  listar: () => api.get('/liberacion'),
  listarAlertasVencimiento: () => api.get('/liberacion/alertas-vencimiento'),
  crear: (payload) => api.post('/liberacion', payload)
};
