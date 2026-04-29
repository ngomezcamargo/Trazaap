import { api } from './api';

export const recepcionesServicio = {
  listar: () => api.get('/receptions'),
  crear: (payload) => api.post('/receptions', payload),
  crearInspeccion: (receptionId, payload) => api.post(`/receptions/${receptionId}/inspection`, payload),
  listarMateriasPrimas: () => api.get('/receptions/materias-primas')
};
