import { z } from 'zod';
export const envasadoSchema = z.object({
  id_manufactura: z.coerce.number().int().positive(),
  fecha_operacion: z.string().datetime(),
  responsable: z.coerce.number().int().positive(),
  descripcion_operacion: z.string().trim().min(3).max(1000),
  resultado: z.string().trim().min(2).max(120),
  observaciones: z.string().trim().max(2000).optional().default('')
});
