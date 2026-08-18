import { z } from 'zod';
export const metadatosDocumentoSchema = z.object({
  proveedor_id: z.coerce.number().int().positive().optional(), materia_prima_id: z.coerce.number().int().positive().optional(),
  tipo_documental: z.enum(['certificado_sanitario','ficha_tecnica','certificado_calidad','otro']),
  fecha_emision: z.union([z.string().date(),z.literal('')]).optional(), fecha_vencimiento: z.union([z.string().date(),z.literal('')]).optional(),
  observaciones: z.string().trim().max(2000).optional().default('')
}).superRefine((d,c)=>{if(Boolean(d.proveedor_id)===Boolean(d.materia_prima_id))c.addIssue({code:z.ZodIssueCode.custom,message:'Asocie el documento exclusivamente a proveedor o materia prima'});if(d.fecha_emision&&d.fecha_vencimiento&&d.fecha_vencimiento<d.fecha_emision)c.addIssue({code:z.ZodIssueCode.custom,path:['fecha_vencimiento'],message:'La fecha de vencimiento no puede ser anterior a la emision'});});
