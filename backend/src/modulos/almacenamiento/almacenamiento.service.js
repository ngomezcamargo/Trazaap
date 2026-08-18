import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { encolarEventoBlockchain } from '../blockchain/outbox.repository.js';
import { procesarOutboxAhora } from '../blockchain/outbox.worker.js';
import {
  actualizarEstadoAlmacenamiento,
  actualizarUbicacion,
  buscarAlmacenamientoPorId,
  buscarAlmacenamientoPorManufactura,
  buscarManufacturaParaAlmacenamiento,
  buscarUbicacionActiva,
  crearControlAlmacenamiento,
  crearIngresoAlmacenamiento,
  crearUbicacion,
  ejecutarTransaccionAlmacenamiento,
  listarAlmacenamientos,
  listarControlesAlmacenamiento,
  listarPendientesAlmacenamiento,
  listarUbicaciones,
  registrarEventoTrazabilidadAlmacenamiento,
  registrarResolucionAlmacenamiento,
  registrarSalidaAlmacenamiento
} from './almacenamiento.repository.js';

const depsPredeterminadas = {
  actualizarEstadoAlmacenamiento,
  buscarAlmacenamientoPorId,
  buscarAlmacenamientoPorManufactura,
  buscarManufacturaParaAlmacenamiento,
  buscarUbicacionActiva,
  crearControlAlmacenamiento,
  crearIngresoAlmacenamiento,
  ejecutarTransaccionAlmacenamiento,
  listarControlesAlmacenamiento,
  registrarEventoTrazabilidadAlmacenamiento,
  registrarResolucionAlmacenamiento,
  registrarSalidaAlmacenamiento,
  encolarEventoBlockchain,
  procesarOutboxAhora
};

function temperaturaEnRango(valor, minimo, maximo) {
  const temperatura = Number(valor);
  return temperatura >= Number(minimo) && temperatura <= Number(maximo);
}

function exigirObservacionSiNoConforme({ conforme, observaciones }) {
  if (!conforme && !String(observaciones || '').trim()) {
    throw new ErrorHttp(400, 'Debe registrar una observacion para documentar la desviacion.');
  }
}

function usuarioId(usuario) {
  const id = Number(usuario?.sub);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorHttp(401, 'Usuario de sesion invalido');
  return id;
}

function despertarOutbox(deps) {
  deps.procesarOutboxAhora().catch((error) => console.error('[Fabric outbox]', error.message));
}

export function listarPendientesAlmacenamientoService() {
  return listarPendientesAlmacenamiento();
}

export function listarUbicacionesService(incluirInactivas = false) {
  return listarUbicaciones({ incluirInactivas });
}

export function crearUbicacionService(data) {
  return crearUbicacion(data);
}

export async function actualizarUbicacionService(id, data) {
  const ubicacion = await actualizarUbicacion(id, data);
  if (!ubicacion) throw new ErrorHttp(404, 'Ubicacion no encontrada');
  return ubicacion;
}

export function listarAlmacenamientosService(estado = '') {
  return listarAlmacenamientos({ estado });
}

export async function obtenerAlmacenamientoService(id) {
  const almacenamiento = await buscarAlmacenamientoPorId(id);
  if (!almacenamiento) throw new ErrorHttp(404, 'Registro de almacenamiento no encontrado');
  return { ...almacenamiento, controles: await listarControlesAlmacenamiento(id) };
}

export async function crearIngresoAlmacenamientoService(data, usuario, deps = depsPredeterminadas) {
  const responsable = usuarioId(usuario);
  const resultado = await deps.ejecutarTransaccionAlmacenamiento(async (db) => {
    const manufactura = await deps.buscarManufacturaParaAlmacenamiento(data.id_manufactura, db);
    if (!manufactura) throw new ErrorHttp(404, 'Manufactura registrada no encontrada');
    if (await deps.buscarAlmacenamientoPorManufactura(data.id_manufactura, db)) {
      throw new ErrorHttp(409, 'El lote ya tiene un registro de almacenamiento');
    }
    const ubicacion = await deps.buscarUbicacionActiva(data.id_ubicacion, db);
    if (!ubicacion) throw new ErrorHttp(400, 'Selecciona una ubicacion activa');

    const conforme = temperaturaEnRango(
      data.temperatura_ingreso_c,
      manufactura.temperatura_almacenamiento_min_c,
      manufactura.temperatura_almacenamiento_max_c
    );
    exigirObservacionSiNoConforme({ conforme, observaciones: data.observaciones });
    const almacenamiento = await deps.crearIngresoAlmacenamiento({
      id_manufactura: manufactura.id_manufactura,
      id_orden_produccion: manufactura.id_orden_produccion,
      id_producto: manufactura.id_producto,
      lote_producido: manufactura.lote_producido,
      id_ubicacion: ubicacion.id_ubicacion,
      temperatura_min_esperada_c: manufactura.temperatura_almacenamiento_min_c,
      temperatura_max_esperada_c: manufactura.temperatura_almacenamiento_max_c,
      temperatura_ingreso_c: data.temperatura_ingreso_c,
      requiere_refrigeracion: manufactura.requiere_refrigeracion,
      estado: conforme ? 'almacenado' : 'retenido',
      observaciones_ingreso: data.observaciones,
      responsable_ingreso: responsable
    }, db);
    await deps.registrarEventoTrazabilidadAlmacenamiento({
      lote: manufactura.lote_producido,
      tipo_evento: 'INGRESO_ALMACENAMIENTO',
      actor: usuario.email,
      payload: { id_almacenamiento: almacenamiento.id_almacenamiento, estado: almacenamiento.estado }
    }, db);
    await deps.encolarEventoBlockchain({
      tipoEvento: 'ingreso_almacenamiento',
      idEntidad: almacenamiento.id_almacenamiento,
      actor: usuario.email
    }, db);
    return { ...almacenamiento, producto: manufactura.producto, codigo_orden: manufactura.codigo_orden };
  });
  despertarOutbox(deps);
  return resultado;
}

export async function crearControlAlmacenamientoService(id, data, usuario, deps = depsPredeterminadas) {
  const responsable = usuarioId(usuario);
  const resultado = await deps.ejecutarTransaccionAlmacenamiento(async (db) => {
    const almacenamiento = await deps.buscarAlmacenamientoPorId(id, db, true);
    if (!almacenamiento) throw new ErrorHttp(404, 'Registro de almacenamiento no encontrado');
    if (['listo_para_liberacion', 'despachado', 'rechazado'].includes(almacenamiento.estado)) {
      throw new ErrorHttp(400, 'El lote ya no admite controles de almacenamiento');
    }
    const enRango = temperaturaEnRango(
      data.temperatura_c,
      almacenamiento.temperatura_min_esperada_c,
      almacenamiento.temperatura_max_esperada_c
    );
    const conforme = enRango && data.condicion_general === 'conforme';
    exigirObservacionSiNoConforme({ conforme, observaciones: data.observaciones });
    const control = await deps.crearControlAlmacenamiento({
      id_almacenamiento: id,
      temperatura_c: data.temperatura_c,
      condicion_general: data.condicion_general,
      resultado: enRango ? 'conforme' : 'fuera_rango',
      observaciones: data.observaciones,
      responsable_control: responsable
    }, db);
    if (!conforme) await deps.actualizarEstadoAlmacenamiento(id, 'retenido', db);
    await deps.registrarEventoTrazabilidadAlmacenamiento({
      lote: almacenamiento.lote_producido,
      tipo_evento: 'CONTROL_ALMACENAMIENTO',
      actor: usuario.email,
      payload: { id_control: control.id_control, resultado: control.resultado, condicion: control.condicion_general }
    }, db);
    await deps.encolarEventoBlockchain({
      tipoEvento: 'control_almacenamiento', idEntidad: control.id_control, actor: usuario.email
    }, db);
    return control;
  });
  despertarOutbox(deps);
  return resultado;
}

export async function registrarSalidaAlmacenamientoService(id, data, usuario, deps = depsPredeterminadas) {
  const responsable = usuarioId(usuario);
  const resultado = await deps.ejecutarTransaccionAlmacenamiento(async (db) => {
    const almacenamiento = await deps.buscarAlmacenamientoPorId(id, db, true);
    if (!almacenamiento) throw new ErrorHttp(404, 'Registro de almacenamiento no encontrado');
    if (almacenamiento.fecha_salida) throw new ErrorHttp(409, 'La salida de almacenamiento ya fue registrada');
    if (almacenamiento.estado !== 'almacenado') {
      throw new ErrorHttp(422, 'El lote debe estar conforme y sin retenciones antes de registrar la salida');
    }
    const controles = await deps.listarControlesAlmacenamiento(id, db);
    if (!controles.length) throw new ErrorHttp(400, 'Debe registrar al menos un control de almacenamiento antes de la salida');
    const enRango = temperaturaEnRango(
      data.temperatura_salida_c,
      almacenamiento.temperatura_min_esperada_c,
      almacenamiento.temperatura_max_esperada_c
    );
    const liberable = data.decision_salida === 'liberar' && data.estado_producto_salida === 'conforme' && enRango;
    exigirObservacionSiNoConforme({ conforme: liberable, observaciones: data.observaciones });
    const estado = liberable
      ? 'listo_para_liberacion'
      : data.decision_salida === 'rechazar' ? 'rechazado' : 'retenido';
    const salida = await deps.registrarSalidaAlmacenamiento(id, {
      ...data,
      observaciones_salida: data.observaciones,
      responsable_salida: responsable,
      estado
    }, db);
    if (!salida) throw new ErrorHttp(409, 'La salida de almacenamiento ya fue registrada');
    await deps.registrarEventoTrazabilidadAlmacenamiento({
      lote: almacenamiento.lote_producido,
      tipo_evento: 'SALIDA_ALMACENAMIENTO',
      actor: usuario.email,
      payload: { id_almacenamiento: id, decision: data.decision_salida, estado }
    }, db);
    await deps.encolarEventoBlockchain({
      tipoEvento: 'salida_almacenamiento', idEntidad: id, actor: usuario.email
    }, db);
    return salida;
  });
  despertarOutbox(deps);
  return resultado;
}

export async function resolverRetencionAlmacenamientoService(id, data, usuario, deps = depsPredeterminadas) {
  const responsable = usuarioId(usuario);
  const resultado = await deps.ejecutarTransaccionAlmacenamiento(async (db) => {
    const almacenamiento = await deps.buscarAlmacenamientoPorId(id, db, true);
    if (!almacenamiento) throw new ErrorHttp(404, 'Registro de almacenamiento no encontrado');
    if (almacenamiento.estado !== 'retenido') throw new ErrorHttp(400, 'El lote no se encuentra retenido');
    const controles = await deps.listarControlesAlmacenamiento(id, db);
    if (data.decision === 'liberar') {
      const ultimo = controles.at(-1);
      if (!ultimo || ultimo.resultado !== 'conforme' || ultimo.condicion_general !== 'conforme') {
        throw new ErrorHttp(422, 'Para liberar la retencion se requiere un control posterior conforme');
      }
    }
    const estado = data.decision === 'liberar'
      ? 'almacenado'
      : data.decision === 'rechazar' ? 'rechazado' : 'retenido';
    const resolucion = await deps.registrarResolucionAlmacenamiento(id, {
      ...data,
      estado,
      responsable_resolucion: responsable
    }, db);
    await deps.registrarEventoTrazabilidadAlmacenamiento({
      lote: almacenamiento.lote_producido,
      tipo_evento: 'RESOLUCION_RETENCION_ALMACENAMIENTO',
      actor: usuario.email,
      payload: { id_almacenamiento: id, decision: data.decision, motivo: data.motivo, estado }
    }, db);
    await deps.encolarEventoBlockchain({
      tipoEvento: 'ingreso_almacenamiento', idEntidad: id, actor: usuario.email, operacion: 'versionar'
    }, db);
    return resolucion;
  });
  despertarOutbox(deps);
  return resultado;
}
