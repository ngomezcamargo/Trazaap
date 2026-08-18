import { z } from 'zod';

const email = z.string().trim().email().max(120).transform((valor) => valor.toLowerCase());
const rol = z.enum(['administrador', 'gerente', 'operario']);
const password = z.string().min(10).max(128)
  .regex(/[a-z]/, 'La contrasena debe incluir una minuscula')
  .regex(/[A-Z]/, 'La contrasena debe incluir una mayuscula')
  .regex(/[0-9]/, 'La contrasena debe incluir un numero');

export const crearUsuarioSchema = z.object({
  email,
  role: rol,
  password
});

export const actualizarUsuarioSchema = z.object({
  email,
  role: rol,
  is_active: z.boolean(),
  password: z.union([password, z.literal('')]).optional()
});
