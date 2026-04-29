import { z } from 'zod';

export const crearLiberacionSchema = z.object({
  producto: z.string().min(2),
  lote_producto: z.string().min(3),
  fecha_vencimiento: z.string().date(),
  unidades_liberadas: z.coerce.number().int().nonnegative(),
  peso_neto: z.coerce.number().positive(),
  verificacion_etiqueta: z.coerce.boolean(),
  verificacion_envase: z.coerce.boolean(),
  numero_factura: z.string().optional().default(''),
  cliente_destino: z.string().optional().default(''),
  conductor: z.string().optional().default(''),
  placa_vehiculo: z.string().optional().default(''),
  limpieza_vehiculo: z.enum(['cumple', 'no_cumple']),
  documentacion_dotacion: z.enum(['cumple', 'no_cumple']),
  responsable_liberacion: z.coerce.number().int().positive(),
  estado_liberacion: z.enum(['liberado', 'retenido', 'rechazado']),
  observaciones: z.string().optional().default('')
});
