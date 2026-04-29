import { api } from './api';

export const autenticacionServicio = {
  iniciarSesion: (payload) => api.post('/auth/login', payload),
  perfil: () => api.get('/auth/me')
};
