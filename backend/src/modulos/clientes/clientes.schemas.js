import { z } from 'zod';

export const clienteSchema = z.object({
  nombre_razon_social: z.string().trim().min(2).max(180),
  nit_documento: z.string().trim().min(3).max(50),
  nombre_contacto: z.string().trim().min(2).max(120),
  telefono: z.string().trim().min(7).max(40),
  email: z.union([z.string().trim().email(), z.literal('')]).optional().default(''),
  direccion: z.string().trim().min(5).max(255),
  estado: z.enum(['activo', 'inactivo']).default('activo')
});
