export const USUARIOS_QA = Object.freeze([
  Object.freeze({
    email: 'admin@trazaap.local',
    rol: 'administrador',
    variablePassword: 'SEED_ADMIN_PASSWORD',
    passwordDesarrolloExistente: 'Admin123*'
  }),
  Object.freeze({
    email: 'gerente.pruebas@trazaap.local',
    rol: 'gerente',
    variablePassword: 'SEED_GERENTE_PASSWORD'
  }),
  Object.freeze({
    email: 'operario@trazaap.local',
    rol: 'operario',
    variablePassword: 'SEED_OPERARIO_PASSWORD',
    passwordDesarrolloExistente: 'Operario123*'
  })
]);

export function resolverPasswordSeed(usuario, variables = process.env) {
  const password = variables[usuario.variablePassword] || usuario.passwordDesarrolloExistente;
  if (!password) {
    throw new Error(`Variable de entorno requerida para seed QA: ${usuario.variablePassword}`);
  }
  return password;
}
