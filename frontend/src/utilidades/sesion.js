const TOKEN_KEY = 'trazaap_token';
const USER_KEY = 'trazaap_user';

export function obtenerToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    const normalized = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function tokenValido() {
  const token = obtenerToken();
  if (!token) return false;

  const payload = parseJwt(token);
  if (!payload?.exp) return false;

  return Date.now() < payload.exp * 1000;
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
