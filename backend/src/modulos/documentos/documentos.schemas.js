import { z } from 'zod';
export const metadatosDocumentoSchema = z.object({
  tipo_documental: z.string().trim().min(2).max(160),
  entidad_emisora: z.string().trim().min(2).max(160),
  numero_documento: z.string().trim().max(120).optional().default(''),
  fecha_emision: z.union([z.string().date(),z.literal('')]).optional(), fecha_vencimiento: z.union([z.string().date(),z.literal('')]).optional(),
  observaciones: z.string().trim().max(2000).optional().default('')
}).superRefine((d,c)=>{if(d.fecha_emision&&d.fecha_vencimiento&&d.fecha_vencimiento<d.fecha_emision)c.addIssue({code:z.ZodIssueCode.custom,path:['fecha_vencimiento'],message:'La fecha de vencimiento no puede ser anterior a la emision'});});
