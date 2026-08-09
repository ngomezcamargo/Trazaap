const ROL_ADMINISTRADOR = 'administrador';
const ROL_GERENTE = 'gerente';
const ROL_OPERARIO = 'operario';

export function normalizarRol(role) {
  const limpio = String(role || '').trim().toLowerCase();
  if (limpio === 'admin' || limpio === 'administrador') return ROL_ADMINISTRADOR;
  if (limpio === 'gerente' || limpio === 'gerencia') return ROL_GERENTE;
  if (limpio === 'operario') return ROL_OPERARIO;
  return null;
}

export function esGerente(role) {
  const rol = normalizarRol(role);
  return rol === ROL_ADMINISTRADOR || rol === ROL_GERENTE;
}

export function esOperario(role) {
  return normalizarRol(role) === ROL_OPERARIO;
}

export function tieneAcceso(role, permitido = []) {
  const rol = normalizarRol(role);
  if (!rol) return false;
  return rol === ROL_ADMINISTRADOR || permitido.includes(rol);
}

export function puedeAdministrar(role) {
  return normalizarRol(role) === ROL_ADMINISTRADOR;
}

export function puedeOperar(role) {
  const rol = normalizarRol(role);
  return rol === ROL_ADMINISTRADOR || rol === ROL_OPERARIO;
}

export function puedeConsultarGestion(role) {
  const rol = normalizarRol(role);
  return rol === ROL_ADMINISTRADOR || rol === ROL_GERENTE;
}

export const ROLES = {
  ADMINISTRADOR: ROL_ADMINISTRADOR,
  GERENTE: ROL_GERENTE,
  OPERARIO: ROL_OPERARIO
};
