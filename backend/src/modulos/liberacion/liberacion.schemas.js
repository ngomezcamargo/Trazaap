import { z } from 'zod';

export const crearLiberacionSchema = z.object({
  id_manufactura: z.coerce.number().int().positive(),
  responsable_liberacion_usuario_id: z.coerce.number().int().positive(),
  tipo_empaque: z.string().min(2),
  unidades_empacadas: z.coerce.number().int().positive(),
  peso_neto: z.coerce.number().positive(),
  fecha_vencimiento: z.string().date(),
  etiqueta_verificada: z.boolean(),
  verificacion_envase: z.boolean(),
  lote_visible: z.boolean(),
  fecha_vencimiento_visible: z.boolean(),
  empaque_conforme: z.boolean(),
  producto_en_buen_estado: z.boolean(),
  estado_liberacion: z.enum(['aprobado', 'retenido', 'rechazado']),
  motivo_retencion: z.string().optional().default(''),
  motivo_rechazo: z.string().optional().default(''),
  observaciones: z.string().optional().default('')
}).strict().superRefine((data, ctx) => {
  const checks = [
    data.etiqueta_verificada,
    data.verificacion_envase,
    data.lote_visible,
    data.fecha_vencimiento_visible,
    data.empaque_conforme,
    data.producto_en_buen_estado
  ];

  if (checks.some((item) => typeof item !== 'boolean')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe completar todas las validaciones de liberacion.'
    });
  }

  if (data.estado_liberacion === 'aprobado' && checks.some((item) => item !== true)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Un lote con validaciones no conformes debe quedar retenido o rechazado.'
    });
  }

  if (data.estado_liberacion === 'retenido' && !data.motivo_retencion.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['motivo_retencion'],
      message: 'Debes registrar el motivo de retencion.'
    });
  }

  if (data.estado_liberacion === 'rechazado' && !data.motivo_rechazo.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['motivo_rechazo'],
      message: 'Debes registrar el motivo de rechazo.'
    });
  }
});
