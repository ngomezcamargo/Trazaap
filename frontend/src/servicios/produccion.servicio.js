import { api } from './api';

export const produccionServicio = {
  listarOrdenes: () => api.get('/produccion/ordenes'),
  listarRecepcionesDisponibles: () => api.get('/produccion/recepciones-disponibles'),
  crearOrden: (payload) => api.post('/produccion/ordenes', payload),
  asociarMaterias: (ordenId, payload) => api.post(`/produccion/ordenes/${ordenId}/materias`, payload),
  registrarMojes: (ordenId, payload) => api.post(`/produccion/ordenes/${ordenId}/mojes`, payload),
  registrarTiempos: (ordenId, payload) => api.post(`/produccion/ordenes/${ordenId}/tiempos`, payload),
};
