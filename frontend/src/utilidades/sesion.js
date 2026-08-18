const TOKEN_KEY = 'trazaap_token';
const USER_KEY = 'trazaap_user';
const LAST_ACTIVITY_KEY = 'trazaap_last_activity';
const AUTH_MODE_KEY = 'trazaap_auth_mode';
let oauthAccessToken = null;
export const LIMITE_INACTIVIDAD_MS = 2 * 60 * 60 * 1000;

export function obtenerToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return oauthAccessToken || localStorage.getItem(TOKEN_KEY);
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

export function registrarActividadSesion() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function sesionActivaPorActividad() {
  if (typeof window === 'undefined') {
    return false;
  }

  const ultimaActividad = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  if (!ultimaActividad) {
    registrarActividadSesion();
    return true;
  }

  return Date.now() - ultimaActividad <= LIMITE_INACTIVIDAD_MS;
}

export function guardarSesion(token, user) {
  oauthAccessToken = null;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_MODE_KEY, 'legacy');
  registrarActividadSesion();
}

export function guardarSesionOAuth(token, user) {
  oauthAccessToken = token;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_MODE_KEY, 'oauth');
  registrarActividadSesion();
}

export function usaOAuth() { return typeof window !== 'undefined' && localStorage.getItem(AUTH_MODE_KEY) === 'oauth'; }

export async function restaurarSesionOAuth() {
  if (!usaOAuth()) return false;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const respuesta = await fetch(`${apiUrl}/auth/oauth/refresh`, { method: 'POST', credentials: 'include' });
  if (!respuesta.ok) return false;
  const tokens = await respuesta.json();
  oauthAccessToken = tokens.access_token;
  return tokenValido();
}

export function obtenerUsuario() {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = localStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
}

export function limpiarSesion() {
  oauthAccessToken = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  localStorage.removeItem(AUTH_MODE_KEY);
}
