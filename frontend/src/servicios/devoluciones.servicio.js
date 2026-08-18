import { api } from './api';
export const devolucionesServicio = { listar: () => api.get('/devoluciones'), crear: (data) => api.post('/devoluciones', data), resolver: (id, data) => api.put(`/devoluciones/${id}/decision`, data) };
