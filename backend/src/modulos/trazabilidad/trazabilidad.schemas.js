import { z } from 'zod';

export const tiposEventoTrazabilidad = [
  'RECEPCION_MATERIA_PRIMA',
  'INICIO_FABRICACION',
  'CIERRE_FABRICACION',
  'CONTROL_CALIDAD',
  'ALMACENAMIENTO',
  'DESPACHO',
  'DEVOLUCION',
  'NO_CONFORMIDAD'
];

export const crearEventoTrazabilidadSchema = z.object({
  codigoLote: z.string().trim().min(1).max(100),
  tipoEvento: z.enum(tiposEventoTrazabilidad),
  descripcion: z.string().trim().min(1).max(2000),
  responsable: z.string().trim().min(1).max(120),
  fechaEvento: z.string().datetime().optional(),
  datosEvento: z.record(z.unknown()).optional()
});
