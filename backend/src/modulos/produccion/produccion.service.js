import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { registrarEventoProduccion } from '../blockchain/blockchain.service.js';
import {
  asociarMateriaPrimaOrden,
  buscarOrdenPorId,
  buscarProductosOrden,
  buscarRecepcionPorId,
  crearIngredienteMoje,
  crearLoteTerminado,
  crearMoje,
  crearOrdenProducto,
  crearOrdenProduccionCabecera,
  listarMateriasOrden,
  listarOrdenesProduccion,
  listarRecepcionesAceptadas,
  listarTiemposOrden,
  registrarEventoTrazabilidad,
  registrarTiempoProduccion
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

export async function crearOrdenProduccionService(data, actor) {
  const orden = await crearOrdenProduccionCabecera(data);
  const productos = [];

  for (const producto of data.productos) {
    const row = await crearOrdenProducto(orden.id, producto);
    productos.push(row);
    if (row.lote_producto_terminado) {
      await crearLoteTerminado(orden.id, row.lote_producto_terminado, row.cantidad_real_producida || 1, orden.fecha_produccion);
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

export async function listarOrdenesProduccionService() {
  return listarOrdenesProduccion();
}

export async function listarRecepcionesAceptadasService() {
  return listarRecepcionesAceptadas();
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

export async function registrarMojesService(ordenId, data, actor) {
  const orden = await buscarOrdenPorId(ordenId);
  if (!orden) throw new ErrorHttp(404, 'Orden de produccion no encontrada');

  const result = [];
  for (const moje of data.mojes) {
    const mojeRow = await crearMoje(ordenId, moje);
    const ingredientes = [];
    for (const item of moje.ingredientes) {
      const recepcion = await buscarRecepcionPorId(item.recepcion_id);
      if (!recepcion) throw new ErrorHttp(404, `Recepcion ${item.recepcion_id} no encontrada`);
      ingredientes.push(await crearIngredienteMoje(mojeRow.id, item));
    }
    result.push({ ...mojeRow, ingredientes });
  }

  await registrarEventoTrazabilidad({
    recepcion_id: null,
    lote: orden.codigo_orden,
    tipo_evento: 'PRODUCTION_MOJES_RECORDED',
    actor,
    payload: { orden_produccion_id: ordenId, mojes: result.length }
  });

  return result;
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
    lote: productos.find((item) => item.lote_producto_terminado)?.lote_producto_terminado || `OP-${orden.id}`,
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
