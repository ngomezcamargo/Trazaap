import { z } from 'zod';

export const proveedorSchema = z.object({
  nombre: z.string().min(2),
  nit: z.string().min(3),
  contacto: z.string().min(2),
  telefono: z.string().min(7),
  email: z.string().email(),
  direccion: z.string().min(5),
  estado: z.enum(['activo', 'inactivo']).default('activo')
});
