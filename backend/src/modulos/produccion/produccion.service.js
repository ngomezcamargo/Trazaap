import { ErrorHttp } from '../../middlewares/errorHttp.js';
import {
  registrarEventoCritico,
  registrarEventoProduccion,
  registrarVersionEventoCritico
} from '../blockchain/blockchain.service.js';
import {
  actualizarCantidadRealMateria,
  actualizarEstadoOrden,
  actualizarEstadoManufacturaProducto,
  actualizarProductoFabricado,
  asociarMateriaPrimaOrden,
  buscarMateriasPorProductoOrdenId,
  buscarMateriasPorOrdenId,
  buscarOrdenPorId,
  buscarMateriaOrdenPorId,
  buscarMovimientoInventarioMateria,
  buscarProductoOrdenPorId,
  buscarProductoFabricadoPorId,
  buscarProductosOrden,
  buscarRecepcionPorId,
  buscarTiemposPorOrdenId,
  buscarUsuarioOperarioPorId,
  buscarVarianteProductoPorId,
  crearMateriaPrimaOrdenPlanificada,
  crearOrdenProducto,
  crearOrdenProduccionCabecera,
  crearProductoFabricado,
  crearRegistroManufactura,
  contarProductosPendientesManufactura,
  descontarInventarioMateria,
  devolverInventarioMateria,
  ejecutarTransaccionProduccion,
  generarLoteProducto,
  listarMateriasOrden,
  listarOrdenesManufactura,
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
  const productosNormalizados = [];

  for (const producto of productos) {
    const productoBase = await buscarProductoFabricadoPorId(producto.producto_id);
    if (!productoBase) throw new ErrorHttp(404, `Producto ${producto.producto_id} no encontrado`);

    const variante = await buscarVarianteProductoPorId(producto.variante_id);
    if (!variante || Number(variante.producto_id) !== Number(producto.producto_id)) {
      throw new ErrorHttp(400, `La variante ${producto.variante_id} no pertenece al producto ${producto.producto_id}`);
    }

    const productoNormalizado = {
      ...producto,
      producto: productoBase.nombre,
      tamano_presentacion: variante.tamano_presentacion
    };
    productosNormalizados.push(productoNormalizado);

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

      requerimientos.push({ producto: productoNormalizado, variante, item, cantidadTotal, unidad, recepcionCompatible });
    }
  }

  return { requerimientos, productosNormalizados };
}

export async function crearOrdenProduccionService(data, actor) {
  const { requerimientos, productosNormalizados } = await prepararRequerimientosOrden(data.productos);
  data.productos = productosNormalizados;
  let orden;
  try {
    orden = await crearOrdenProduccionCabecera(data);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'ordenes_produccion_codigo_orden_key') {
      throw new ErrorHttp(409, `Ya existe una orden de produccion con el codigo ${data.codigo_orden}.`);
    }
    throw error;
  }
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
    }
  }

  await registrarVersionEventoCritico('orden_produccion', orden.id, actor, 'Creacion de la orden de produccion');

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

export async function crearProductoFabricadoService(data, actor = 'sistema') {
  let producto;
  try {
    producto = await crearProductoFabricado(data);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'productos_fabricados_prefijo_lote_key') {
      throw new ErrorHttp(409, `Ya existe un producto con el prefijo de lote ${data.prefijo_lote}.`);
    }
    throw error;
  }
  await reemplazarVariantesProducto(producto.id, data.variantes);
  await registrarVersionEventoCritico(
    'producto_fabricado_configurado',
    producto.id,
    actor,
    'Creacion de la ficha tecnica y receta del producto'
  );
  return obtenerDetalleProductoFabricadoService(producto.id);
}

export async function actualizarProductoFabricadoService(id, data, actor = 'sistema') {
  let producto;
  try {
    producto = await actualizarProductoFabricado(id, data);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'productos_fabricados_prefijo_lote_key') {
      throw new ErrorHttp(409, `Ya existe un producto con el prefijo de lote ${data.prefijo_lote}.`);
    }
    throw error;
  }
  if (!producto) throw new ErrorHttp(404, 'Producto no encontrado');
  await reemplazarVariantesProducto(producto.id, data.variantes);
  await registrarVersionEventoCritico(
    'producto_fabricado_configurado',
    producto.id,
    actor,
    'Actualizacion autorizada de la ficha tecnica o receta del producto'
  );
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
    const productoBase = await buscarProductoFabricadoPorId(p.producto_id);
    const variante = await buscarVarianteProductoPorId(p.variante_id);
    const receta = await listarRecetaVariante(p.variante_id);

    for (const item of receta) {
      const cantidadTotal = Number(item.cantidad_requerida) * Number(p.cantidad_programada);
      const disponible = Number(item.inventario_disponible || 0);
      resumen.push({
        producto: productoBase?.nombre || p.producto || '',
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

  }
  return resumen;
}

export async function listarOrdenesProduccionService() {
  return listarOrdenesProduccion();
}

export async function listarOrdenesManufacturaService() {
  return listarOrdenesManufactura();
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

export async function obtenerContextoManufacturaService(ordenId, productoOrdenId) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const producto = await buscarProductoOrdenPorId(ordenId, productoOrdenId);
  if (!producto) throw new ErrorHttp(404, 'Producto de la orden no encontrado');

  const materias = await buscarMateriasPorProductoOrdenId(ordenId, productoOrdenId);
  return { orden, producto, materias };
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

  await registrarVersionEventoCritico(
    'orden_produccion',
    ordenId,
    actor,
    `Cambio autorizado de estado de orden: ${orden.estado} a ${estado}`
  );

  return actualizada;
}

function desviacion(valorReal, valorEsperado) {
  if (valorReal === null || valorReal === undefined || valorEsperado === null || valorEsperado === undefined) return false;
  return Number(valorReal) !== Number(valorEsperado);
}

function construirComparacionManufactura(producto, registro) {
  const rows = [
    {
      variable: 'Fermentacion',
      esperado: {
        tiempo_minutos: Number(producto.tiempo_fermentacion_minutos || 0),
        temperatura_c: Number(producto.temperatura_fermentacion_c || 0)
      },
      real: {
        tiempo_minutos: Number(registro.tiempo_real_fermentacion_minutos || 0),
        temperatura_c: Number(registro.temperatura_real_fermentacion_c || 0)
      }
    },
    {
      variable: 'Horneado',
      esperado: {
        tiempo_minutos: Number(producto.tiempo_horneado_minutos || 0),
        temperatura_c: Number(producto.temperatura_horneado_c || 0)
      },
      real: {
        tiempo_minutos: Number(registro.tiempo_real_horneado_minutos || 0),
        temperatura_c: Number(registro.temperatura_real_horneado_c || 0)
      }
    }
  ];

  if (producto.requiere_inmersion) {
    rows.push({
      variable: 'Inmersion',
      esperado: {
        tiempo_minutos: Number(producto.tiempo_inmersion_minutos || 0),
        temperatura_c: Number(producto.temperatura_inmersion_c || 0)
      },
      real: {
        tiempo_minutos: Number(registro.tiempo_real_inmersion_minutos || 0),
        temperatura_c: Number(registro.temperatura_real_inmersion_c || 0)
      }
    });
  }

  return rows.map((item) => ({
    ...item,
    desviado:
      desviacion(item.real.tiempo_minutos, item.esperado.tiempo_minutos) ||
      desviacion(item.real.temperatura_c, item.esperado.temperatura_c)
  }));
}

async function descontarMateriasPorManufactura(orden, productoOrdenId, registro, actor, db) {
  const materias = await buscarMateriasPorProductoOrdenId(orden.id, productoOrdenId, db);
  const consumos = [];

  for (const materia of materias) {
    const movimientoManufactura = await buscarMovimientoInventarioMateria({
      materia_prima_id: materia.materia_prima_id,
      tipo_movimiento: 'salida',
      referencia_tipo: 'registro_manufactura',
      referencia_id: registro.id_manufactura
    }, db);
    if (movimientoManufactura) continue;

    const movimientoOrdenAnterior = await buscarMovimientoInventarioMateria({
      materia_prima_id: materia.materia_prima_id,
      tipo_movimiento: 'salida',
      referencia_tipo: 'orden_produccion',
      referencia_id: orden.id
    }, db);
    if (movimientoOrdenAnterior) continue;

    const cantidad = Number(materia.cantidad_real);
    const inventario = await descontarInventarioMateria({
      materia_prima_id: materia.materia_prima_id,
      cantidad,
      unidad_medida: materia.unidad_medida,
      referencia_tipo: 'registro_manufactura',
      referencia_id: registro.id_manufactura,
      actor,
      observaciones: `Consumo real por manufactura ${registro.lote_producido} en orden ${orden.codigo_orden}`
    }, db);

    if (!inventario) {
      throw new ErrorHttp(
        400,
        `Inventario insuficiente para registrar consumo real de ${materia.nombre_ingrediente}. Requerido: ${cantidad} ${materia.unidad_medida}.`
      );
    }

    consumos.push({
      materia_prima: materia.nombre_ingrediente,
      cantidad,
      unidad_medida: materia.unidad_medida,
      inventario_id: inventario.id,
      movimiento_id: inventario.movimiento_id
    });
  }

  return consumos;
}

async function validarDisponibilidadManufactura(orden, productoOrdenId, db) {
  const materias = await buscarMateriasPorProductoOrdenId(orden.id, productoOrdenId, db);

  for (const materia of materias) {
    const movimientoOrdenAnterior = await buscarMovimientoInventarioMateria({
      materia_prima_id: materia.materia_prima_id,
      tipo_movimiento: 'salida',
      referencia_tipo: 'orden_produccion',
      referencia_id: orden.id
    }, db);
    if (movimientoOrdenAnterior) continue;

    const disponible = Number(materia.inventario_disponible || 0);
    const requerido = Number(materia.cantidad_real || 0);
    if (disponible < requerido) {
      throw new ErrorHttp(
        400,
        `Inventario insuficiente para registrar consumo real de ${materia.nombre_ingrediente}. Requerido: ${requerido} ${materia.unidad_medida}, disponible: ${disponible} ${materia.unidad_medida}.`
      );
    }
  }
}

export async function registrarManufacturaService(ordenId, productoOrdenId, data, actor) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');
  if (!['pendiente', 'en_proceso'].includes(orden.estado)) {
    throw new ErrorHttp(400, 'Solo se puede registrar manufactura en ordenes pendientes o en proceso');
  }

  const producto = await buscarProductoOrdenPorId(ordenId, productoOrdenId);
  if (!producto) throw new ErrorHttp(404, 'Producto de la orden no encontrado');
  if (producto.id_manufactura) throw new ErrorHttp(400, 'Este producto ya tiene manufactura registrada');

  if (producto.requiere_inmersion && (data.tiempo_real_inmersion_minutos == null || data.temperatura_real_inmersion_c == null)) {
    throw new ErrorHttp(400, 'Este producto requiere registrar tiempo y temperatura real de inmersion');
  }

  const responsable = await buscarUsuarioOperarioPorId(data.responsable_usuario_id);
  if (!responsable) {
    throw new ErrorHttp(400, 'Selecciona un operario activo como responsable de la manufactura');
  }

  let resultadoOperativo;
  try {
    resultadoOperativo = await ejecutarTransaccionProduccion(async (db) => {
      await validarDisponibilidadManufactura(orden, productoOrdenId, db);
      const loteGenerado = await generarLoteProducto(ordenId, productoOrdenId, db);
      const registro = await crearRegistroManufactura({
        ...data,
        id_orden_produccion: ordenId,
        id_producto: productoOrdenId,
        lote_producido: loteGenerado.lote_producido,
        fecha_vencimiento_calculada: loteGenerado.fecha_vencimiento_calculada,
        registrado_por_usuario_id: responsable.id,
        registrado_por: responsable.email
      }, db);

      const comparacion = construirComparacionManufactura(producto, registro);
      const consumosInventario = await descontarMateriasPorManufactura(orden, productoOrdenId, registro, actor, db);
      const tieneDesviaciones = comparacion.some((item) => item.desviado);
      await actualizarEstadoManufacturaProducto(productoOrdenId, tieneDesviaciones ? 'con_observaciones' : 'registrado', db);

      if (orden.estado === 'pendiente') {
        await actualizarEstadoOrden(ordenId, 'en_proceso', db);
      }

      const pendientes = await contarProductosPendientesManufactura(ordenId, db);
      if (pendientes === 0) {
        await actualizarEstadoOrden(ordenId, 'finalizada', db);
      }

      await registrarEventoTrazabilidad({
        recepcion_id: null,
        lote: registro.lote_producido,
        tipo_evento: 'MANUFACTURA_PRODUCTO_REGISTRADA',
        actor,
        payload: {
          evento_futuro_blockchain: 'manufactura_producto',
          orden_produccion_id: ordenId,
          orden_producto_id: productoOrdenId,
          producto: producto.producto,
          lote_producido: registro.lote_producido,
          unidades_producidas: registro.unidades_producidas,
          consumos_inventario: consumosInventario,
          responsable_usuario_id: responsable.id,
          responsable_manufactura: responsable.email,
          comparacion
        }
      }, db);

      return { registro, comparacion, consumosInventario, tieneDesviaciones, pendientes };
    });
  } catch (error) {
    throw new ErrorHttp(error.status || 400, error.message || 'No fue posible registrar la manufactura.');
  }

  const { registro, comparacion, consumosInventario, tieneDesviaciones, pendientes } = resultadoOperativo;

  for (const consumo of consumosInventario) {
    await registrarVersionEventoCritico(
      'inventario_materia_prima',
      consumo.inventario_id,
      actor,
      `Consumo de materia prima por manufactura ${registro.lote_producido}`
    );
    if (consumo.movimiento_id) {
      await registrarEventoCritico('movimiento_inventario', consumo.movimiento_id, actor);
    }
  }

  await registrarEventoCritico('registro_manufactura', registro.id_manufactura, actor);
  await registrarVersionEventoCritico(
    'orden_produccion',
    ordenId,
    actor,
    `Registro de manufactura del lote ${registro.lote_producido}`
  );

  return {
    registro,
    responsable,
    estado_manufactura: tieneDesviaciones ? 'con_observaciones' : 'registrado',
    orden_lista_para_liberacion: false,
    orden_finalizada: pendientes === 0,
    comparacion,
    consumos_inventario: consumosInventario,
    blockchain: {
      preparado: true,
      tipoEvento: 'manufactura_producto'
    }
  };
}

export async function actualizarCantidadRealMateriaService(ordenId, materiaId, cantidadReal, actor) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const anterior = await buscarMateriaOrdenPorId(ordenId, materiaId);
  if (!anterior) throw new ErrorHttp(404, 'Materia asociada no encontrada en la orden');

  const actualizada = await actualizarCantidadRealMateria(ordenId, materiaId, cantidadReal);
  if (!actualizada) throw new ErrorHttp(404, 'Materia asociada no encontrada en la orden');

  const diferencia = Number(cantidadReal) - Number(anterior.cantidad_real);
  const productoOrden = await buscarProductoOrdenPorId(ordenId, actualizada.orden_producto_id);
  if (diferencia !== 0 && productoOrden?.id_manufactura) {
    const recepcion = await buscarRecepcionPorId(actualizada.recepcion_id);
    if (diferencia > 0) {
      const inventario = await descontarInventarioMateria({
        materia_prima_id: recepcion.materia_prima_id,
        cantidad: diferencia,
        unidad_medida: actualizada.unidad_medida,
        referencia_tipo: 'registro_manufactura',
        referencia_id: productoOrden.id_manufactura,
        actor,
        observaciones: `Ajuste por aumento de cantidad real en orden ${orden.codigo_orden}`
      });
      if (!inventario) throw new ErrorHttp(400, `Inventario insuficiente para aumentar el consumo de ${actualizada.nombre_ingrediente}.`);
      await registrarVersionEventoCritico(
        'inventario_materia_prima',
        inventario.id,
        actor,
        `Aumento del consumo real en orden ${orden.codigo_orden}`
      );
      if (inventario.movimiento_id) await registrarEventoCritico('movimiento_inventario', inventario.movimiento_id, actor);
    } else {
      const inventario = await devolverInventarioMateria({
        materia_prima_id: recepcion.materia_prima_id,
        cantidad: Math.abs(diferencia),
        unidad_medida: actualizada.unidad_medida,
        referencia_tipo: 'registro_manufactura',
        referencia_id: productoOrden.id_manufactura,
        actor,
        observaciones: `Ajuste por reduccion de cantidad real en orden ${orden.codigo_orden}`
      });
      await registrarVersionEventoCritico(
        'inventario_materia_prima',
        inventario.id,
        actor,
        `Devolucion por reduccion del consumo real en orden ${orden.codigo_orden}`
      );
      if (inventario.movimiento_id) await registrarEventoCritico('movimiento_inventario', inventario.movimiento_id, actor);
    }
  }

  await registrarEventoTrazabilidad({
    recepcion_id: actualizada.recepcion_id,
    lote: orden.codigo_orden,
    tipo_evento: 'PRODUCTION_MATERIAL_REAL_UPDATED',
    actor,
    payload: { orden_produccion_id: ordenId, materia_id: materiaId, cantidad_real: cantidadReal }
  });

  await registrarVersionEventoCritico(
    'orden_produccion',
    ordenId,
    actor,
    `Actualizacion de cantidad real de materia prima en orden ${orden.codigo_orden}`
  );

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

  await registrarVersionEventoCritico(
    'orden_produccion',
    ordenId,
    actor,
    `Asociacion autorizada de materias primas a la orden ${orden.codigo_orden}`
  );

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
  const loteProducto = rows[0]?.lote_producto || tiempos.find((item) => item.lote_producto)?.lote_producto;

  await registrarEventoProduccion({
    tipoEvento: 'produccion',
    lote: loteProducto || `OP-${orden.id}`,
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
