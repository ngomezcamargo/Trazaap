import { api } from './api';
export const devolucionesServicio = { listar: () => api.get('/devoluciones'), crear: (data) => api.post('/devoluciones', data) };
