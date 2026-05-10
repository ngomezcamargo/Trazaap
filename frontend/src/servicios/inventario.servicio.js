import { api } from './api';

export const inventarioServicio = {
  listar: () => api.get('/inventario-insumos'),
  listarTerminados: () => api.get('/inventario-insumos/terminados')
};
