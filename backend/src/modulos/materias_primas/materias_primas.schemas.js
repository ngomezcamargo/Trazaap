import { z } from 'zod';

const unidadesBase = [
  'gramos',
  'kilogramos',
  'mililitros',
  'litros',
  'unidad',
  'docena',
  'caja',
  'paquete',
  'bulto',
  'otro'
];

const tiposInsumo = ['solido', 'liquido', 'unitario'];

export const materiaPrimaSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional().default(''),
  unidad_medida_base: z.enum(unidadesBase, {
    errorMap: () => ({ message: 'Debe seleccionar una unidad de medida para esta materia prima.' })
  }),
  descripcion_unidad_personalizada: z.string().optional().default(''),
  tipo_insumo: z.enum(tiposInsumo).optional().nullable(),
  condiciones_almacenamiento: z.string().optional().default(''),
  proveedor_id: z.coerce.number().int().positive().nullable().optional(),
  is_active: z.coerce.boolean().optional().default(true)
}).superRefine((data, ctx) => {
  if (data.unidad_medida_base === 'otro' && !String(data.descripcion_unidad_personalizada || '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['descripcion_unidad_personalizada'],
      message: 'Debe describir la unidad personalizada cuando selecciona "otro".'
    });
  }
});
