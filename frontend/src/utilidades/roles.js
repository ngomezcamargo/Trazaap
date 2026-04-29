const ROL_GERENTE = 'gerente';
const ROL_OPERARIO = 'operario';

export function normalizarRol(role) {
  const limpio = String(role || '').trim().toLowerCase();
  if (limpio === 'admin' || limpio === 'gerente' || limpio === 'gerencia') return ROL_GERENTE;
  if (limpio === 'operario') return ROL_OPERARIO;
  return ROL_OPERARIO;
}

export function esGerente(role) {
  return normalizarRol(role) === ROL_GERENTE;
}

export function esOperario(role) {
  return normalizarRol(role) === ROL_OPERARIO;
}

export function tieneAcceso(role, permitido = []) {
  return permitido.includes(normalizarRol(role));
}

export const ROLES = {
  GERENTE: ROL_GERENTE,
  OPERARIO: ROL_OPERARIO
};
