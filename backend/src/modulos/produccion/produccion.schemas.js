import { z } from 'zod';

const estadosOrden = ['pendiente', 'en_proceso', 'lista_para_liberacion', 'finalizada', 'cancelada'];
const tamanos = ['grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail', 'unico', 'kilo', 'libra'];
const estadosProducto = ['activo', 'inactivo'];

export const recetaMateriaSchema = z.object({
  materia_prima_id: z.coerce.number().int().positive(),
  cantidad_requerida: z.coerce.number().positive(),
  observaciones: z.string().optional().default('')
});

export const varianteProductoSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  tamano_presentacion: z.enum(tamanos).default('mediano'),
  peso_estimado_unidad: z.coerce.number().positive().optional().nullable(),
  unidad_medida: z.string().optional().default('unidad'),
  estado: z.enum(estadosProducto).default('activo'),
  receta: z.array(recetaMateriaSchema).min(1)
});

export const productoFabricadoSchema = z.object({
  nombre: z.string().min(2),
  categoria: z.string().optional().default(''),
  descripcion: z.string().optional().default(''),
  vida_util_dias: z.coerce.number().int().positive(),
  condiciones_almacenamiento: z.string().optional().default(''),
  requiere_inmersion: z.coerce.boolean().default(false),
  tiempo_fermentacion_minutos: z.coerce.number().nonnegative().default(0),
  temperatura_fermentacion_c: z.coerce.number().default(0),
  tiempo_horneado_minutos: z.coerce.number().nonnegative().default(0),
  temperatura_horneado_c: z.coerce.number().default(0),
  tiempo_inmersion_minutos: z.coerce.number().nonnegative().optional().default(0),
  temperatura_inmersion_c: z.coerce.number().optional().default(0),
  estado: z.enum(estadosProducto).default('activo'),
  variantes: z.array(varianteProductoSchema).min(1)
}).superRefine((data, ctx) => {
  if (data.requiere_inmersion && (!data.tiempo_inmersion_minutos || !data.temperatura_inmersion_c)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tiempo_inmersion_minutos'], message: 'Debe registrar tiempos de inmersion cuando aplica.' });
  }
});

export const crearOrdenProduccionSchema = z.object({
  fecha_produccion: z.string().date(),
  codigo_orden: z.string().min(2),
  estado: z.enum(estadosOrden).default('pendiente'),
  observaciones: z.string().optional().default(''),
  creado_por: z.coerce.number().int().positive().optional(),
  productos: z
    .array(
      z.object({
        producto_id: z.coerce.number().int().positive(),
        variante_id: z.coerce.number().int().positive(),
        producto: z.string().optional().default(''),
        tamano_presentacion: z.enum(tamanos).optional(),
        cantidad_programada: z.coerce.number().positive(),
        observaciones: z.string().optional().default('')
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

export const registrarTiemposSchema = z.object({
  registros: z
    .array(
      z.object({
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

export const registroManufacturaSchema = z.object({
  responsable_usuario_id: z.coerce.number().int().positive(),
  lote_producido: z.string().min(2),
  unidades_producidas: z.coerce.number().int().nonnegative(),
  tiempo_real_fermentacion_minutos: z.coerce.number().nonnegative().default(0),
  temperatura_real_fermentacion_c: z.coerce.number().default(0),
  tiempo_real_horneado_minutos: z.coerce.number().nonnegative().default(0),
  temperatura_real_horneado_c: z.coerce.number().default(0),
  tiempo_real_inmersion_minutos: z.coerce.number().nonnegative().optional().nullable(),
  temperatura_real_inmersion_c: z.coerce.number().optional().nullable(),
  hora_inicio: z.string().datetime(),
  hora_fin: z.string().datetime(),
  observaciones: z.string().optional().default('')
}).superRefine((data, ctx) => {
  if (new Date(data.hora_fin).getTime() < new Date(data.hora_inicio).getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hora_fin'], message: 'La hora de fin no puede ser anterior a la hora de inicio.' });
  }
});

export const actualizarEstadoOrdenSchema = z.object({
  estado: z.enum(estadosOrden)
});

export const actualizarCantidadRealMateriaSchema = z.object({
  cantidad_real: z.coerce.number().positive()
});

export const calcularInsumosSchema = z.object({
  productos: z.array(z.object({
    producto_id: z.coerce.number().int().positive(),
    variante_id: z.coerce.number().int().positive(),
    cantidad_programada: z.coerce.number().positive(),
    producto: z.string().optional().default('')
  })).min(1)
});
