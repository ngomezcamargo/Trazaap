import { z } from 'zod';

export const iniciarSesionSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Password invalido')
});
