import { z } from 'zod';

const estadosOrden = ['pendiente', 'en_proceso', 'finalizada', 'cancelada'];
const tamanos = ['grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail'];

export const crearOrdenProduccionSchema = z.object({
  fecha_produccion: z.string().date(),
  codigo_orden: z.string().min(2),
  responsable_produccion: z.coerce.number().int().positive(),
  estado: z.enum(estadosOrden).default('pendiente'),
  observaciones: z.string().optional().default(''),
  creado_por: z.coerce.number().int().positive(),
  productos: z
    .array(
      z.object({
        producto: z.string().min(2),
        codigo_producto: z.string().optional().default(''),
        tamano_presentacion: z.enum(tamanos),
        cantidad_programada: z.coerce.number().positive(),
        cantidad_real_producida: z.coerce.number().nonnegative(),
        unidad_medida: z.string().min(1),
        lote_producto_terminado: z.string().optional().default('')
      })
    )
    .min(1)
});

export const asociarMateriasSchema = z.object({
  materias: z
    .array(
      z.object({
        orden_producto_id: z.coerce.number().int().positive(),
        recepcion_id: z.coerce.number().int().positive(),
        nombre_ingrediente: z.string().min(2),
        cantidad_planificada: z.coerce.number().positive(),
        cantidad_real: z.coerce.number().positive(),
        unidad_medida: z.string().default('gramos'),
        observaciones: z.string().optional().default('')
      })
    )
    .min(1)
});

export const registrarMojesSchema = z.object({
  mojes: z
    .array(
      z.object({
        producto_receta: z.string().min(2),
        cantidad_total_moje_gramos: z.coerce.number().positive(),
        ingredientes: z
          .array(
            z.object({
              recepcion_id: z.coerce.number().int().positive(),
              ingrediente: z.string().min(2),
              lote_ingrediente: z.string().min(2),
              cantidad_gramos: z.coerce.number().positive()
            })
          )
          .min(1)
      })
    )
    .min(1)
});

export const registrarTiemposSchema = z.object({
  registros: z
    .array(
      z.object({
        numero_carro_escabiladero: z.string().min(1),
        producto: z.string().min(2),
        es_bagel: z.coerce.boolean().default(false),
        unidades_producidas: z.coerce.number().int().nonnegative(),
        temperatura_crecimiento: z.coerce.number(),
        tiempo_crecimiento_min: z.coerce.number().int().nonnegative(),
        temperatura_inmersion_agua: z.coerce.number().optional(),
        tiempo_inmersion_agua_seg: z.coerce.number().int().nonnegative().optional(),
        temperatura_horneo: z.coerce.number(),
        tiempo_horneo_min: z.coerce.number().int().nonnegative(),
        lote_producto: z.string().min(2),
        responsable_produccion: z.coerce.number().int().positive(),
        observaciones: z.string().optional().default('')
      })
    )
    .min(1)
});
