import { api } from './api';

export const almacenamientoServicio = {
  listarPendientes: () => api.get('/almacenamiento/pendientes'),
  listar: (estado = '') => api.get(`/almacenamiento${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`),
  obtener: (id) => api.get(`/almacenamiento/${id}`),
  crearIngreso: (payload) => api.post('/almacenamiento/ingresos', payload),
  crearControl: (id, payload) => api.post(`/almacenamiento/${id}/controles`, payload),
  registrarSalida: (id, payload) => api.post(`/almacenamiento/${id}/salida`, payload),
  resolverRetencion: (id, payload) => api.post(`/almacenamiento/${id}/resolucion`, payload),
  listarUbicaciones: (todas = false) => api.get(`/almacenamiento/ubicaciones${todas ? '?todas=true' : ''}`),
  crearUbicacion: (payload) => api.post('/almacenamiento/ubicaciones', payload),
  actualizarUbicacion: (id, payload) => api.put(`/almacenamiento/ubicaciones/${id}`, payload)
};

export const supervisionFabricServicio = {
  listar: () => api.get('/blockchain?limite=50'),
  resumen: () => api.get('/blockchain/resumen'),
  reintentar: (id) => api.post(`/blockchain/${id}/reintentar`, {})
};

