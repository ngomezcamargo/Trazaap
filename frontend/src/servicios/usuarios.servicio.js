import { api } from './api';

export const usuariosServicio = {
  listar: () => api.get('/usuarios'),
  crear: (datos) => api.post('/usuarios', datos),
  actualizar: (id, datos) => api.put(`/usuarios/${id}`, datos)
};
