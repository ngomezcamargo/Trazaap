export const ROLES = {
  ADMINISTRADOR: 'administrador',
  GERENTE: 'gerente',
  OPERARIO: 'operario'
};

export function normalizarRol(role) {
  const limpio = String(role || '').trim().toLowerCase();

  if (limpio === 'admin' || limpio === 'administrador') return ROLES.ADMINISTRADOR;
  if (limpio === 'gerencia' || limpio === 'gerente') return ROLES.GERENTE;
  if (limpio === 'operario') return ROLES.OPERARIO;

  return limpio;
}
