import { z } from 'zod';

export const materiaPrimaSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional().default(''),
  unidad_medida: z.string().min(1),
  condiciones_almacenamiento: z.string().optional().default(''),
  proveedor_id: z.coerce.number().int().positive().nullable().optional(),
  is_active: z.coerce.boolean().optional().default(true)
});
