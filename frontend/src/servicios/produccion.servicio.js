import { api } from './api';

export const produccionServicio = {
  listarOrdenes: () => api.get('/produccion/ordenes'),
  listarOrdenesManufactura: () => api.get('/produccion/manufactura/ordenes'),
  obtenerOrden: (ordenId) => api.get(`/produccion/ordenes/${ordenId}`),
  obtenerContextoManufactura: (ordenId, productoId) => api.get(`/produccion/ordenes/${ordenId}/productos/${productoId}/manufactura`),
  listarProductos: (q = '') => api.get(`/produccion/productos${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  obtenerProducto: (productoId) => api.get(`/produccion/productos/${productoId}`),
  crearProducto: (payload) => api.post('/produccion/productos', payload),
  actualizarProducto: (productoId, payload) => api.put(`/produccion/productos/${productoId}`, payload),
  calcularInsumos: (payload) => api.post('/produccion/calcular-insumos', payload),
  listarRecepcionesDisponibles: () => api.get('/produccion/recepciones-disponibles'),
  crearOrden: (payload) => api.post('/produccion/ordenes', payload),
  actualizarEstadoOrden: (ordenId, payload) => api.put(`/produccion/ordenes/${ordenId}/estado`, payload),
  asociarMaterias: (ordenId, payload) => api.post(`/produccion/ordenes/${ordenId}/materias`, payload),
  actualizarCantidadRealMateria: (ordenId, materiaId, payload) => api.put(`/produccion/ordenes/${ordenId}/materias/${materiaId}`, payload),
  registrarTiempos: (ordenId, payload) => api.post(`/produccion/ordenes/${ordenId}/tiempos`, payload),
  registrarManufactura: (ordenId, productoId, payload) => api.post(`/produccion/ordenes/${ordenId}/productos/${productoId}/manufactura`, payload)
};
