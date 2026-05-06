import { api } from './api';

export const inventarioServicio = {
  listar: () => api.get('/inventario-insumos')
};
