import { z } from 'zod';

const estados = ['aceptado', 'rechazado', 'retenido'];

const inspeccionProductoSchema = z.object({
  olor: z.coerce.boolean({ message: 'Debe registrar el olor del producto.' }),
  color: z.coerce.boolean({ message: 'Debe registrar el color del producto.' }),
  textura: z.coerce.boolean({ message: 'Debe registrar la textura del producto.' }),
  estado_empaque: z.coerce.boolean({ message: 'Debe registrar el estado del empaque.' }),
  certificado_calidad: z.coerce.boolean({ message: 'Debe registrar el certificado de calidad.' }),
  observaciones_producto: z.string().optional().default(''),
  decision_producto: z.enum(estados, {
    errorMap: () => ({ message: 'Debe seleccionar una decision para la inspeccion del producto.' })
  })
});

const inspeccionVehiculoSchema = z.object({
  vehiculo: z.string().trim().min(1, 'Debe registrar el vehiculo.'),
  conductor: z.string().trim().min(1, 'Debe registrar el conductor.'),
  placa: z.string().optional().default(''),
  limpieza_vehiculo: z.coerce.boolean({ message: 'Debe validar las condiciones del vehiculo.' }),
  transporte_vehiculo: z.coerce.boolean({ message: 'Debe validar las condiciones del vehiculo.' }),
  observaciones_vehiculo: z.string().optional().default('')
});

export const crearRecepcionSchema = z.object({
  fecha_recepcion: z.string().datetime().optional(),
  proveedor_id: z.coerce.number().int().positive(),
  materia_prima_id: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  unidad_medida: z.string().trim().min(1).optional(),
  presentacion: z.enum(['bulto', 'caja', 'unidad', 'otro']),
  numero_lote: z.string().min(2),
  fecha_vencimiento: z.string().date(),
  temperatura: z.coerce.number(),
  observaciones: z.string().optional().default(''),
  recibido_por: z.coerce.number().int().positive(),
  estado_recepcion: z.enum(estados),
  inspeccion_producto: inspeccionProductoSchema.optional(),
  inspeccion_vehiculo: inspeccionVehiculoSchema.optional()
}).superRefine((data, ctx) => {
  if (!data.inspeccion_producto) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe completar la inspeccion de producto antes de guardar la recepcion.',
      path: ['inspeccion_producto']
    });
  }

  if (!data.inspeccion_vehiculo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe completar la inspeccion del vehiculo antes de guardar la recepcion.',
      path: ['inspeccion_vehiculo']
    });
  }
});
