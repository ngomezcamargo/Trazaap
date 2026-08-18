import { z } from 'zod';

const temperatura = z.coerce.number().min(-50).max(100);

export const crearDespachoSchema = z.object({
  id_cliente: z.coerce.number().int().positive(),
  numero_factura: z.string().trim().min(1).max(80),
  fecha_despacho: z.coerce.date(),
  conductor: z.string().trim().min(2).max(120),
  placa_vehiculo: z.string().trim().min(2).max(20),
  temperatura_salida_c: temperatura,
  temperatura_transporte_c: temperatura,
  limpieza_vehiculo: z.enum(['cumple', 'no_cumple']),
  documentacion_dotacion: z.enum(['cumple', 'no_cumple']),
  canal_distribucion: z.string().trim().min(2).max(60),
  observaciones: z.string().trim().max(2000).optional().default(''),
  detalles: z.array(z.object({
    id_inventario_producto_terminado: z.coerce.number().int().positive(),
    cantidad_despachada: z.coerce.number().int().positive()
  })).min(1)
}).superRefine((data, ctx) => {
  const ids = data.detalles.map((item) => item.id_inventario_producto_terminado);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['detalles'],
      message: 'No puedes repetir el mismo lote dentro del despacho'
    });
  }
});

export const confirmarEntregaSchema = z.object({
  id_despacho: z.coerce.number().int().positive(),
  factura: z.string().trim().max(80).optional().default(''),
  codigo: z.string().trim().max(120).optional().default(''),
  receptor: z.string().trim().min(2).max(160),
  temperatura_entrega_c: temperatura,
  observaciones: z.string().trim().max(2000).optional().default('')
}).refine((data) => Boolean(data.factura || data.codigo), {
  message: 'Debes indicar la factura o el codigo privado'
});
