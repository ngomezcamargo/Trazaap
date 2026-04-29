import { api } from './api';

export const materiasPrimasServicio = {
  listar: () => api.get('/materias-primas'),
  crear: (payload) => api.post('/materias-primas', payload),
  actualizar: (id, payload) => api.put(`/materias-primas/${id}`, payload)
};
