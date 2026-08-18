import { api } from './api';

export const despachosServicio = {
  listarInventario: () => api.get('/despachos/inventario-disponible'),
  listar: () => api.get('/despachos'),
  consultar: (id) => api.get(`/despachos/${id}`),
  crear: (data) => api.post('/despachos', data)
};
