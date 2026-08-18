import { z } from 'zod';

export const ubicacionSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  descripcion: z.string().trim().max(1000).optional().default(''),
  tipo: z.enum(['ambiente', 'refrigerado', 'congelado']).default('ambiente'),
  activo: z.coerce.boolean().default(true)
});

export const ingresoAlmacenamientoSchema = z.object({
  id_manufactura: z.coerce.number().int().positive(),
  id_ubicacion: z.coerce.number().int().positive(),
  temperatura_ingreso_c: z.coerce.number().min(-50).max(100),
  observaciones: z.string().trim().max(2000).optional().default('')
});

export const controlAlmacenamientoSchema = z.object({
  temperatura_c: z.coerce.number().min(-50).max(100),
  condicion_general: z.enum(['conforme', 'no_conforme']),
  observaciones: z.string().trim().max(2000).optional().default('')
});

export const salidaAlmacenamientoSchema = z.object({
  temperatura_salida_c: z.coerce.number().min(-50).max(100),
  estado_producto_salida: z.enum(['conforme', 'no_conforme']),
  decision_salida: z.enum(['liberar', 'retener', 'rechazar']),
  observaciones: z.string().trim().max(2000).optional().default('')
});

export const resolucionAlmacenamientoSchema = z.object({
  decision: z.enum(['liberar', 'mantener_retenido', 'rechazar']),
  motivo: z.string().trim().min(5).max(1000),
  observaciones: z.string().trim().max(2000).optional().default('')
});

