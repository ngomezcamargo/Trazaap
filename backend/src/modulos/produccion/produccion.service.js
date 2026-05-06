import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarEventoProduccion } from '../blockchain/blockchain.service.js';
import {
  actualizarCantidadRealMateria,
  actualizarEstadoOrden,
  actualizarProductoFabricado,
  asociarMateriaPrimaOrden,
  buscarMateriasPorOrdenId,
  buscarOrdenPorId,
  buscarMateriaOrdenPorId,
  buscarProductoFabricadoPorId,
  buscarProductosOrden,
  buscarRecepcionPorId,
  buscarTiemposPorOrdenId,
  buscarVarianteProductoPorId,
  crearMateriaPrimaOrdenPlanificada,
  crearOrdenProducto,
  crearOrdenProduccionCabecera,
  crearProductoFabricado,
  descontarInventarioMateria,
  devolverInventarioMateria,
  listarMateriasOrden,
  listarOrdenesProduccion,
  listarProductosFabricados,
  listarRecepcionesAceptadas,
  listarRecetaVariante,
  listarTiemposOrden,
  listarVariantesProducto,
  registrarEventoTrazabilidad,
  registrarTiempoProduccion,
  reemplazarVariantesProducto
} from './produccion.repository.js';

function validarRangos(item) {
  const fueraCrecimiento = item.temperatura_crecimiento < 25 || item.temperatura_crecimiento > 35;
  const fueraHorneo = item.temperatura_horneo < 150 || item.temperatura_horneo > 175;
  const fueraInmersion =
    item.es_bagel &&
    (item.temperatura_inmersion_agua == null ||
      item.temperatura_inmersion_agua < 85 ||
      item.temperatura_inmersion_agua > 95);

  if ((fueraCrecimiento || fueraHorneo || fueraInmersion) && !item.observaciones?.trim()) {
    throw new ErrorHttp(400, 'Debes registrar observaciones cuando haya valores fuera de rango');
  }

  if (item.es_bagel && (item.tiempo_inmersion_agua_seg == null || item.tiempo_inmersion_agua_seg < 0)) {
    throw new ErrorHttp(400, 'Para bagels debes registrar tiempo de inmersion en agua');
  }
}

async function prepararRequerimientosOrden(productos) {
  const recepciones = await listarRecepcionesAceptadas();
  const requerimientos = [];

  for (const producto of productos) {
    const productoBase = await buscarProductoFabricadoPorId(producto.producto_id);
    if (!productoBase) throw new ErrorHttp(404, `Producto ${producto.producto_id} no encontrado`);

    const variante = await buscarVarianteProductoPorId(producto.variante_id);
    if (!variante || Number(variante.producto_id) !== Number(producto.producto_id)) {
      throw new ErrorHttp(400, `La variante ${producto.variante_id} no pertenece al producto ${producto.producto_id}`);
    }

    const receta = await listarRecetaVariante(producto.variante_id);
    if (!receta.length) {
      throw new ErrorHttp(400, `La variante ${variante.tamano_presentacion} no tiene receta configurada`);
    }

    for (const item of receta) {
      const cantidadTotal = Number(item.cantidad_requerida) * Number(producto.cantidad_programada);
      const unidad = item.unidad_medida_base || item.inventario_unidad || item.unidad_medida || 'unidad';
      const disponible = Number(item.inventario_disponible || 0);
      const recepcionCompatible = recepciones.find((r) => Number(r.materia_prima_id) === Number(item.materia_prima_id));

      if (!recepcionCompatible) {
        throw new ErrorHttp(400, `No hay recepciones aceptadas disponibles para ${item.materia_prima}.`);
      }

      if (disponible < cantidadTotal) {
        throw new ErrorHttp(
          400,
          `Inventario insuficiente para ${item.materia_prima}. Requerido: ${cantidadTotal} ${unidad}, disponible: ${disponible} ${unidad}.`
        );
      }

      requerimientos.push({ producto, variante, item, cantidadTotal, unidad, recepcionCompatible });
    }
  }

  return requerimientos;
}

export async function crearOrdenProduccionService(data, actor) {
  const requerimientos = await prepararRequerimientosOrden(data.productos);
  const orden = await crearOrdenProduccionCabecera(data);
  const productos = [];

  for (const producto of data.productos) {
    const row = await crearOrdenProducto(orden.id, producto);
    productos.push(row);

    const requerimientosProducto = requerimientos.filter((req) => req.producto === producto);

    for (const req of requerimientosProducto) {
      await crearMateriaPrimaOrdenPlanificada(orden.id, {
        orden_producto_id: row.id,
        recepcion_id: req.recepcionCompatible.id,
        nombre_ingrediente: req.item.materia_prima,
        cantidad_planificada: req.cantidadTotal,
        cantidad_real: req.cantidadTotal,
        unidad_medida: req.unidad,
        observaciones: req.item.observaciones || ''
      });

      const inventario = await descontarInventarioMateria({
        materia_prima_id: req.item.materia_prima_id,
        cantidad: req.cantidadTotal,
        unidad_medida: req.unidad,
        orden_produccion_id: orden.id,
        actor,
        observaciones: `Consumo planificado por orden ${data.codigo_orden}`
      });

      if (!inventario) {
        throw new ErrorHttp(400, `No fue posible descontar inventario de ${req.item.materia_prima}. Verifica cantidad y unidad.`);
      }
    }
  }

  await registrarEventoTrazabilidad({
    recepcion_id: null,
    lote: data.codigo_orden,
    tipo_evento: 'PRODUCTION_ORDER_CREATED',
    actor,
    payload: { orden_produccion_id: orden.id, estado: orden.estado, productos: productos.length }
  });

  return { ...orden, productos };
}

export async function listarProductosFabricadosService(filtro) {
  return listarProductosFabricados(filtro);
}

export async function crearProductoFabricadoService(data) {
  const producto = await crearProductoFabricado(data);
  await reemplazarVariantesProducto(producto.id, data.variantes);
  return obtenerDetalleProductoFabricadoService(producto.id);
}

export async function actualizarProductoFabricadoService(id, data) {
  const producto = await actualizarProductoFabricado(id, data);
  if (!producto) throw new ErrorHttp(404, 'Producto no encontrado');
  await reemplazarVariantesProducto(producto.id, data.variantes);
  return obtenerDetalleProductoFabricadoService(producto.id);
}

export async function obtenerDetalleProductoFabricadoService(id) {
  const producto = await buscarProductoFabricadoPorId(id);
  if (!producto) throw new ErrorHttp(404, 'Producto no encontrado');

  const variantes = await listarVariantesProducto(id);
  const variantesConReceta = await Promise.all(
    variantes.map(async (variante) => ({
      ...variante,
      receta: await listarRecetaVariante(variante.id)
    }))
  );

  return { ...producto, variantes: variantesConReceta };
}

export async function calcularInsumosRequeridosService(data) {
  const resumen = [];
  for (const p of data.productos) {
    const variante = await buscarVarianteProductoPorId(p.variante_id);
    const receta = await listarRecetaVariante(p.variante_id);

    for (const item of receta) {
      const cantidadTotal = Number(item.cantidad_requerida) * Number(p.cantidad_programada);
      const disponible = Number(item.inventario_disponible || 0);
      resumen.push({
        producto: p.producto,
        producto_id: p.producto_id,
        variante_id: p.variante_id,
        variante: variante?.tamano_presentacion || '',
        materia_prima: item.materia_prima,
        materia_prima_id: item.materia_prima_id,
        cantidad_por_unidad: Number(item.cantidad_requerida),
        cantidad_programada_producto: Number(p.cantidad_programada),
        cantidad_total_requerida: cantidadTotal,
        unidad_medida: item.unidad_medida_base || item.unidad_medida || 'unidad',
        inventario_disponible: disponible,
        estado: disponible >= cantidadTotal ? 'suficiente' : 'insuficiente',
        advertencia: disponible >= cantidadTotal ? '' : 'No hay suficiente inventario disponible para esta materia prima.'
      });
    }

    const productoData = await buscarProductoFabricadoPorId(p.producto_id);
    if (productoData) {
      resumen.push({
        producto: p.producto,
        producto_id: p.producto_id,
        variante_id: p.variante_id,
        variante: variante?.tamano_presentacion || '',
        materia_prima: 'Tiempos estandar',
        materia_prima_id: null,
        cantidad_por_unidad: `${productoData.tiempo_fermentacion_minutos}m fermentacion / ${productoData.tiempo_horneado_minutos}m horneado`,
        cantidad_programada_producto: Number(p.cantidad_programada),
        cantidad_total_requerida: productoData.requiere_inmersion
          ? `Inmersion ${productoData.tiempo_inmersion_minutos}m a ${productoData.temperatura_inmersion_c}C`
          : 'Sin inmersion',
        unidad_medida: 'referencia',
        inventario_disponible: null,
        estado: 'referencia',
        advertencia: ''
      });
    }
  }
  return resumen;
}

export async function listarOrdenesProduccionService() {
  return listarOrdenesProduccion();
}

export async function listarRecepcionesAceptadasService() {
  return listarRecepcionesAceptadas();
}

export async function obtenerDetalleOrdenService(ordenId) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const [productos, materias, tiempos] = await Promise.all([
    buscarProductosOrden(ordenId),
    buscarMateriasPorOrdenId(ordenId),
    buscarTiemposPorOrdenId(ordenId)
  ]);

  return { orden, productos, materias, tiempos };
}

export async function actualizarEstadoOrdenService(ordenId, estado, actor) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const actualizada = await actualizarEstadoOrden(ordenId, estado);
  await registrarEventoTrazabilidad({
    recepcion_id: null,
    lote: orden.codigo_orden,
    tipo_evento: 'PRODUCTION_ORDER_STATUS_CHANGED',
    actor,
    payload: { orden_produccion_id: ordenId, estado_anterior: orden.estado, estado_nuevo: estado }
  });

  return actualizada;
}

export async function actualizarCantidadRealMateriaService(ordenId, materiaId, cantidadReal, actor) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const anterior = await buscarMateriaOrdenPorId(ordenId, materiaId);
  if (!anterior) throw new ErrorHttp(404, 'Materia asociada no encontrada en la orden');

  const actualizada = await actualizarCantidadRealMateria(ordenId, materiaId, cantidadReal);
  if (!actualizada) throw new ErrorHttp(404, 'Materia asociada no encontrada en la orden');

  const diferencia = Number(cantidadReal) - Number(anterior.cantidad_real);
  if (diferencia !== 0) {
    const recepcion = await buscarRecepcionPorId(actualizada.recepcion_id);
    if (diferencia > 0) {
      const inventario = await descontarInventarioMateria({
        materia_prima_id: recepcion.materia_prima_id,
        cantidad: diferencia,
        unidad_medida: actualizada.unidad_medida,
        orden_produccion_id: ordenId,
        actor,
        observaciones: `Ajuste por aumento de cantidad real en orden ${orden.codigo_orden}`
      });
      if (!inventario) throw new ErrorHttp(400, `Inventario insuficiente para aumentar el consumo de ${actualizada.nombre_ingrediente}.`);
    } else {
      await devolverInventarioMateria({
        materia_prima_id: recepcion.materia_prima_id,
        cantidad: Math.abs(diferencia),
        unidad_medida: actualizada.unidad_medida,
        orden_produccion_id: ordenId,
        actor,
        observaciones: `Ajuste por reduccion de cantidad real en orden ${orden.codigo_orden}`
      });
    }
  }

  await registrarEventoTrazabilidad({
    recepcion_id: actualizada.recepcion_id,
    lote: orden.codigo_orden,
    tipo_evento: 'PRODUCTION_MATERIAL_REAL_UPDATED',
    actor,
    payload: { orden_produccion_id: ordenId, materia_id: materiaId, cantidad_real: cantidadReal }
  });

  return actualizada;
}

export async function asociarMateriasService(ordenId, data, actor) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const productos = await buscarProductosOrden(ordenId);
  const productoIds = new Set(productos.map((item) => item.id));

  const creados = [];
  for (const materia of data.materias) {
    if (!productoIds.has(materia.orden_producto_id)) {
      throw new ErrorHttp(400, `El producto ${materia.orden_producto_id} no pertenece a la orden`);
    }

    const recepcion = await buscarRecepcionPorId(materia.recepcion_id);
    if (!recepcion) throw new ErrorHttp(404, `Recepcion ${materia.recepcion_id} no encontrada`);

    const row = await asociarMateriaPrimaOrden(ordenId, materia);
    creados.push(row);

    await registrarEventoTrazabilidad({
      recepcion_id: recepcion.id,
      lote: recepcion.lote_proveedor,
      tipo_evento: 'PRODUCTION_MATERIAL_LINKED',
      actor,
      payload: { orden_produccion_id: ordenId, ingrediente: materia.nombre_ingrediente, cantidad_real: materia.cantidad_real }
    });
  }

  return creados;
}

export async function registrarTiemposService(ordenId, data, actor) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const rows = [];
  for (const item of data.registros) {
    validarRangos(item);
    rows.push(await registrarTiempoProduccion(ordenId, item));
  }

  await registrarEventoTrazabilidad({
    recepcion_id: null,
    lote: orden.codigo_orden,
    tipo_evento: 'PRODUCTION_TIMES_RECORDED',
    actor,
    payload: { orden_produccion_id: ordenId, registros: rows.length }
  });

  const materias = await listarMateriasOrden(ordenId);
  const productos = await buscarProductosOrden(ordenId);
  const tiempos = await listarTiemposOrden(ordenId);

  await registrarEventoProduccion({
    tipoEvento: 'produccion',
    lote: `OP-${orden.id}`,
    usuario: actor,
    responsable: orden.responsable_produccion,
    productosProducidos: productos,
    materiasPrimasUsadas: materias,
    lotesIngredientes: materias.map((item) => item.lote_proveedor),
    cantidadesRealesUsadas: materias.map((item) => ({ ingrediente: item.nombre_ingrediente, cantidad: item.cantidad_real })),
    unidadesProducidas: tiempos.map((item) => ({ producto: item.producto, unidades: item.unidades_producidas })),
    tiemposTemperaturasCriticas: tiempos
  });

  return rows;
}
