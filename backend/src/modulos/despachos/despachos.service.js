import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { encolarEventoBlockchain } from '../blockchain/outbox.repository.js';
import { buscarClientePorId } from '../clientes/clientes.repository.js';
import { generarCodigoClienteDespacho, normalizarCodigo } from '../publico/codigos-acceso.util.js';
import {
  actualizarConfirmacion,
  actualizarDespacho,
  actualizarEstadoAlmacenamientoDesdeInventario,
  bloquearInventarios,
  buscarConfirmacionPorDespacho,
  buscarDespachoPorId,
  buscarDespachoSimplePorId,
  buscarDespachosPorLote,
  confirmarReservaInventario,
  crearConfirmacionEntrega,
  crearDespacho,
  crearDetalleDespacho,
  ejecutarTransaccionDespacho,
  liberarReservaInventario,
  listarDespachos,
  listarDetallesDespacho,
  listarInventariosDespachables,
  registrarEventoTrazabilidadDespacho,
  reservarUnidadesInventario,
  siguienteCodigoDespacho
} from './despachos.repository.js';

const depsPredeterminadas = {
  actualizarConfirmacion,
  actualizarDespacho,
  actualizarEstadoAlmacenamientoDesdeInventario,
  bloquearInventarios,
  buscarClientePorId,
  buscarConfirmacionPorDespacho,
  buscarDespachoPorId,
  buscarDespachoSimplePorId,
  buscarDespachosPorLote,
  confirmarReservaInventario,
  crearConfirmacionEntrega,
  crearDespacho,
  crearDetalleDespacho,
  ejecutarTransaccionDespacho,
  liberarReservaInventario,
  listarDetallesDespacho,
  registrarEventoTrazabilidadDespacho,
  reservarUnidadesInventario,
  siguienteCodigoDespacho,
  encolarEventoBlockchain
};

function mapaDetalles(detalles) {
  return new Map(detalles.map((item) => [Number(item.id_inventario_producto_terminado), item]));
}

function validarInventarioParaDespacho(inventario, solicitud, data) {
  if (inventario.estado_liberacion !== 'aprobado') {
    throw new ErrorHttp(422, `El lote ${inventario.lote} no tiene liberacion aprobada`);
  }
  if (Number(inventario.unidades_disponibles) < Number(solicitud.cantidad_despachada)) {
    throw new ErrorHttp(409, `El lote ${inventario.lote} solo tiene ${inventario.unidades_disponibles} unidades disponibles`, {
      codigo: Number(inventario.unidades_disponibles) <= 0 ? 'LOTE_SIN_EXISTENCIAS' : 'STOCK_INSUFICIENTE'
    });
  }
  if (!['liberado', 'despacho_parcial'].includes(inventario.estado_almacenamiento)) {
    throw new ErrorHttp(422, `El lote ${inventario.lote} no esta disponible para despacho`);
  }
  if (String(inventario.fecha_vencimiento).slice(0, 10) < new Date(data.fecha_despacho).toISOString().slice(0, 10)) {
    throw new ErrorHttp(422, `El lote ${inventario.lote} se encuentra vencido`);
  }

  const minimo = Number(inventario.temperatura_min_esperada_c);
  const maximo = Number(inventario.temperatura_max_esperada_c);
  const salida = Number(data.temperatura_salida_c);
  const transporte = Number(data.temperatura_transporte_c);
  if ([minimo, maximo].every(Number.isFinite) && (salida < minimo || salida > maximo || transporte < minimo || transporte > maximo)) {
    throw new ErrorHttp(422, `La temperatura del despacho para ${inventario.lote} debe estar entre ${minimo} y ${maximo} C`, {
      codigo: 'DESPACHO_BLOQUEADO'
    });
  }
}

export function listarInventariosDespachablesService() {
  return listarInventariosDespachables();
}

export async function listarDespachosService() {
  const despachos = await listarDespachos();
  return despachos.map((despacho) => ({
    ...despacho,
    codigo_cliente: despacho.es_heredado ? null : generarCodigoClienteDespacho(despacho)
  }));
}

export async function consultarDespachoService(id) {
  const despacho = await buscarDespachoPorId(id);
  if (!despacho) throw new ErrorHttp(404, 'Despacho no encontrado');
  return {
    ...despacho,
    codigo_cliente: despacho.es_heredado ? null : generarCodigoClienteDespacho(despacho)
  };
}

export async function crearDespachoService(data, usuario, deps = depsPredeterminadas) {
  const cliente = await deps.buscarClientePorId(data.id_cliente);
  if (!cliente || cliente.estado !== 'activo') throw new ErrorHttp(400, 'Selecciona un cliente activo');

  const resultado = await deps.ejecutarTransaccionDespacho(async (db) => {
    const solicitudes = mapaDetalles(data.detalles);
    const inventarios = await deps.bloquearInventarios([...solicitudes.keys()], db);
    if (inventarios.length !== solicitudes.size) {
      throw new ErrorHttp(404, 'Uno o mas lotes de inventario no existen');
    }

    for (const inventario of inventarios) {
      validarInventarioParaDespacho(inventario, solicitudes.get(Number(inventario.id_inventario)), data);
    }

    const codigoDespacho = await deps.siguienteCodigoDespacho(data.fecha_despacho, db);
    const despacho = await deps.crearDespacho({
      ...data,
      codigo_despacho: codigoDespacho,
      responsable_despacho: Number(usuario.sub)
    }, db);

    const detalles = [];
    for (const inventario of inventarios) {
      const solicitud = solicitudes.get(Number(inventario.id_inventario));
      const reservado = await deps.reservarUnidadesInventario(
        inventario.id_inventario,
        solicitud.cantidad_despachada,
        db
      );
      if (!reservado) {
        throw new ErrorHttp(409, `El saldo del lote ${inventario.lote} cambio durante el registro`, {
          codigo: 'STOCK_INSUFICIENTE'
        });
      }
      detalles.push(await deps.crearDetalleDespacho({
        id_despacho: despacho.id_despacho,
        id_inventario: inventario.id_inventario,
        id_liberacion: inventario.id_liberacion,
        cantidad_despachada: solicitud.cantidad_despachada
      }, db));

      await deps.registrarEventoTrazabilidadDespacho({
        lote: inventario.lote,
        tipo_evento: 'DESPACHO_PENDIENTE_BLOCKCHAIN',
        actor: usuario.email,
        payload: {
          id_despacho: despacho.id_despacho,
          codigo_despacho: despacho.codigo_despacho,
          cliente: cliente.nombre_razon_social,
          cantidad: solicitud.cantidad_despachada
        }
      }, db);
    }

    await deps.encolarEventoBlockchain({
      tipoEvento: 'despacho_producto',
      idEntidad: despacho.id_despacho,
      operacion: 'registrar_despacho',
      actor: usuario.email
    }, db);

    return { despacho, detalles };
  });

  return {
    ...resultado.despacho,
    cliente,
    detalles: resultado.detalles,
    codigo_cliente: generarCodigoClienteDespacho(resultado.despacho),
    mensaje: 'Despacho reservado y pendiente de validacion blockchain'
  };
}

function estadoAlmacenamiento(inventario) {
  return inventario.estado === 'despachado_total' ? 'despachado' : 'despacho_parcial';
}

export async function confirmarDespachoProcesado(idDespacho, evidencia, deps = depsPredeterminadas) {
  return deps.ejecutarTransaccionDespacho(async (db) => {
    const despacho = await deps.buscarDespachoSimplePorId(idDespacho, db, true);
    if (!despacho) throw new Error(`Despacho ${idDespacho} no encontrado`);
    if (['despachado', 'entregado'].includes(despacho.estado_despacho)) return despacho;
    if (despacho.estado_despacho !== 'pendiente_validacion_blockchain') {
      throw new Error(`El despacho ${idDespacho} no esta pendiente`);
    }

    const detalles = await deps.listarDetallesDespacho(idDespacho, db);
    for (const detalle of detalles) {
      const inventario = await deps.confirmarReservaInventario(
        detalle.id_inventario_producto_terminado,
        detalle.cantidad_despachada,
        db
      );
      if (!inventario) throw new Error(`No fue posible confirmar el saldo del lote ${detalle.lote}`);
      await deps.actualizarEstadoAlmacenamientoDesdeInventario(
        inventario.id_inventario,
        estadoAlmacenamiento(inventario),
        db
      );
      await deps.registrarEventoTrazabilidadDespacho({
        lote: detalle.lote,
        tipo_evento: 'DESPACHO_PRODUCTO_REGISTRADO',
        actor: despacho.responsable_despacho,
        payload: {
          id_despacho: despacho.id_despacho,
          codigo_despacho: despacho.codigo_despacho,
          cantidad: detalle.cantidad_despachada,
          transaccion_fabric: evidencia?.transactionId || evidencia?.txId || null
        }
      }, db);
    }
    return deps.actualizarDespacho(idDespacho, 'despachado', {}, db);
  });
}

export async function bloquearDespachoPorFabric(idDespacho, error, deps = depsPredeterminadas) {
  return deps.ejecutarTransaccionDespacho(async (db) => {
    const despacho = await deps.buscarDespachoSimplePorId(idDespacho, db, true);
    if (!despacho || despacho.estado_despacho !== 'pendiente_validacion_blockchain') return despacho;
    const detalles = await deps.listarDetallesDespacho(idDespacho, db);
    for (const detalle of detalles) {
      const inventario = await deps.liberarReservaInventario(
        detalle.id_inventario_producto_terminado,
        detalle.cantidad_despachada,
        db
      );
      if (inventario) {
        await deps.actualizarEstadoAlmacenamientoDesdeInventario(
          inventario.id_inventario,
          inventario.estado === 'despacho_parcial' ? 'despacho_parcial' : 'liberado',
          db
        );
      }
    }
    return deps.actualizarDespacho(idDespacho, 'bloqueado', {
      motivo: String(error?.message || error).slice(0, 2000)
    }, db);
  });
}

export async function buscarDespachoCliente({ lote, factura, codigo }) {
  const despachos = await buscarDespachosPorLote(lote);
  return despachos.find((despacho) => {
    if (despacho.es_heredado) return normalizarCodigo(factura) === normalizarCodigo(despacho.numero_factura);
    const codigoEsperado = generarCodigoClienteDespacho(despacho);
    return (
      (factura && normalizarCodigo(factura) === normalizarCodigo(despacho.numero_factura)) ||
      (codigo && normalizarCodigo(codigo) === normalizarCodigo(codigoEsperado))
    );
  }) || null;
}

export async function registrarConfirmacionEntregaService(data, deps = depsPredeterminadas) {
  const despacho = await deps.buscarDespachoPorId(data.id_despacho);
  if (!despacho) throw new ErrorHttp(404, 'Despacho no encontrado');
  if (despacho.estado_despacho !== 'despachado') {
    throw new ErrorHttp(409, 'El despacho no esta disponible para confirmar');
  }
  const codigoEsperado = generarCodigoClienteDespacho(despacho);
  const credencialValida = (
    (data.factura && normalizarCodigo(data.factura) === normalizarCodigo(despacho.numero_factura)) ||
    (data.codigo && normalizarCodigo(data.codigo) === normalizarCodigo(codigoEsperado))
  );
  if (!credencialValida) throw new ErrorHttp(403, 'Factura o codigo privado incorrecto');

  return deps.ejecutarTransaccionDespacho(async (db) => {
    if (await deps.buscarConfirmacionPorDespacho(data.id_despacho, db, true)) {
      throw new ErrorHttp(409, 'Este despacho ya tiene una confirmacion registrada');
    }
    const confirmacion = await deps.crearConfirmacionEntrega({
      ...data,
      fecha_recepcion: new Date()
    }, db);
    await deps.encolarEventoBlockchain({
      tipoEvento: 'confirmacion_recepcion_cliente',
      idEntidad: confirmacion.id_confirmacion,
      operacion: 'confirmar_entrega',
      actor: data.receptor
    }, db);
    return {
      ...confirmacion,
      estado: 'PENDIENTE_BLOCKCHAIN',
      mensaje: 'Recepcion registrada y pendiente de confirmacion blockchain'
    };
  });
}

export async function confirmarEntregaProcesada(idConfirmacion, evidencia, deps = depsPredeterminadas) {
  return deps.ejecutarTransaccionDespacho(async (db) => {
    const { rows } = await db.query(
      'SELECT * FROM confirmaciones_entrega WHERE id_confirmacion = $1 FOR UPDATE',
      [idConfirmacion]
    );
    const confirmacion = rows[0];
    if (!confirmacion) throw new Error(`Confirmacion ${idConfirmacion} no encontrada`);
    if (confirmacion.estado_confirmacion === 'confirmada') return confirmacion;
    const actualizada = await deps.actualizarConfirmacion(idConfirmacion, 'confirmada', null, db);
    await deps.actualizarDespacho(confirmacion.id_despacho, 'entregado', {
      temperaturaEntrega: confirmacion.temperatura_entrega_c,
      fechaEntrega: confirmacion.fecha_recepcion
    }, db);
    return { ...actualizada, blockchain: evidencia };
  });
}

export async function bloquearConfirmacionPorFabric(idConfirmacion, error, deps = depsPredeterminadas) {
  return deps.ejecutarTransaccionDespacho(async (db) => (
    deps.actualizarConfirmacion(
      idConfirmacion,
      'bloqueada',
      String(error?.message || error).slice(0, 2000),
      db
    )
  ));
}
