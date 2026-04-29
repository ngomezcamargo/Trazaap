import { z } from 'zod';

const estados = ['aceptado', 'rechazado', 'retenido'];

export const crearRecepcionSchema = z.object({
  fecha_recepcion: z.string().datetime(),
  proveedor_id: z.coerce.number().int().positive(),
  materia_prima_id: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  unidad_presentacion: z.string().min(1),
  lote_proveedor: z.string().min(2),
  fecha_vencimiento: z.string().date(),
  temperatura_recepcion: z.coerce.number(),
  peso_recibido: z.coerce.number().positive(),
  observaciones: z.string().optional().default(''),
  recibido_por: z.coerce.number().int().positive(),
  estado_recepcion: z.enum(estados)
});

export const crearInspeccionSchema = z.object({
  olor: z.string().min(1),
  color: z.string().min(1),
  textura: z.string().min(1),
  estado_empaque: z.string().min(1),
  certificado_calidad: z.coerce.boolean(),
  inspeccion_vehiculo: z.coerce.boolean(),
  observaciones: z.string().optional().default(''),
  decision_final: z.enum(estados),
  inspeccionado_por: z.coerce.number().int().positive()
});
