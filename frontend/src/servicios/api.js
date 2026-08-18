import { limpiarSesion, obtenerToken, registrarActividadSesion, sesionActivaPorActividad } from '@/utilidades/sesion';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function request(path, options = {}) {
  const token = obtenerToken();
  if (token && !sesionActivaPorActividad()) {
    limpiarSesion();
    throw new Error('Sesion cerrada por inactividad. Inicia sesion nuevamente.');
  }

  const headers = {
    ...(!(typeof FormData !== 'undefined' && options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      limpiarSesion();
    }
    if (response.status === 403) {
      throw new Error(data.message || 'No tienes permisos para realizar esta accion');
    }
    const error = new Error(data.message || 'Error en la solicitud');
    error.status = response.status;
    Object.assign(error, data);
    throw error;
  }

  if (token) {
    registrarActividadSesion();
  }

  return data;
}

async function requestPublico(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Error en la solicitud');
    error.status = response.status;
    Object.assign(error, data);
    throw error;
  }

  return data;
}

async function descargar(path) {
  const token = obtenerToken();
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    let data = {}; try { data = await response.json(); } catch {}
    throw new Error(data.message || 'No fue posible descargar el archivo');
  }
  registrarActividadSesion();
  return response.blob();
}

async function descargarPost(path, body) {
  const token = obtenerToken();
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  if (!response.ok) { let data={}; try{data=await response.json();}catch{} throw new Error(data.message || 'No fue posible generar el archivo'); }
  registrarActividadSesion(); return response.blob();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  postForm: (path, body) => request(path, { method: 'POST', body }),
  descargar,
  descargarPost
};

export const apiPublica = {
  get: (path) => requestPublico(path),
  post: (path, body) => requestPublico(path, { method: 'POST', body: JSON.stringify(body) })
};
