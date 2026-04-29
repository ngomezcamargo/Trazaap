import { z } from 'zod';

const estados = ['aceptado', 'rechazado', 'retenido'];

const inspeccionProductoSchema = z.object({
  olor: z.coerce.boolean(),
  color: z.coerce.boolean(),
  textura: z.coerce.boolean(),
  estado_empaque: z.coerce.boolean(),
  certificado_calidad: z.coerce.boolean(),
  observaciones_producto: z.string().optional().default(''),
  decision_producto: z.enum(estados)
});

const inspeccionVehiculoSchema = z.object({
  vehiculo: z.string().min(1),
  conductor: z.string().min(1),
  placa: z.string().optional().default(''),
  limpieza_vehiculo: z.coerce.boolean(),
  transporte_vehiculo: z.coerce.boolean(),
  observaciones_vehiculo: z.string().optional().default('')
});

export const crearRecepcionSchema = z.object({
  fecha_recepcion: z.string().datetime().optional(),
  proveedor_id: z.coerce.number().int().positive(),
  materia_prima_id: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  presentacion: z.enum(['bulto', 'caja', 'otro']),
  numero_lote: z.string().min(2),
  fecha_vencimiento: z.string().date(),
  temperatura: z.coerce.number(),
  observaciones: z.string().optional().default(''),
  recibido_por: z.coerce.number().int().positive(),
  estado_recepcion: z.enum(estados),
  inspeccion_producto: inspeccionProductoSchema,
  inspeccion_vehiculo: inspeccionVehiculoSchema
});
