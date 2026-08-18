import { z } from 'zod';

export const devolucionSchema = z.object({
  tipo_caso: z.enum(['rechazo_pre_despacho', 'devolucion_post_despacho']),
  lote: z.string().trim().min(2).max(100),
  id_cliente: z.coerce.number().int().positive().nullable().optional(),
  id_despacho: z.coerce.number().int().positive().nullable().optional(),
  cantidad: z.coerce.number().int().positive(),
  fecha_registro: z.string().datetime(),
  motivo: z.string().trim().min(3).max(3000),
  accion: z.enum(['pendiente_decision', 'retiro', 'reproceso', 'destruccion']).default('pendiente_decision'),
  fecha_decision: z.string().datetime().nullable().optional(),
  responsable: z.coerce.number().int().positive(),
  observaciones: z.string().trim().max(3000).optional().default('')
}).superRefine((data, ctx) => {
  if (data.tipo_caso === 'devolucion_post_despacho' && (!data.id_cliente || !data.id_despacho)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['id_despacho'], message: 'La devolucion posterior requiere cliente y despacho' });
  }
  if (data.tipo_caso === 'rechazo_pre_despacho' && data.id_despacho) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['id_despacho'], message: 'El rechazo previo no puede asociarse a un despacho' });
  }
  if (data.accion !== 'pendiente_decision' && !data.fecha_decision) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fecha_decision'], message: 'La accion tomada requiere fecha de decision' });
  }
  if (data.accion === 'pendiente_decision' && data.fecha_decision) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fecha_decision'], message: 'Una decision pendiente no debe tener fecha de decision' });
  }
});
