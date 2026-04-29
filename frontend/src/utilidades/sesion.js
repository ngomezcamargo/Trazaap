const TOKEN_KEY = 'trazaap_token';
const USER_KEY = 'trazaap_user';

export function obtenerToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function guardarSesion(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function obtenerUsuario() {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = localStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
}

export function limpiarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
