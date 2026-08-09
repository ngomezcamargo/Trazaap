import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { confirmarRecepcionCliente as confirmarRecepcionEnFabric } from '../blockchain/blockchain.service.js';
import { consultarTrazabilidadPorLote } from '../trazabilidad/trazabilidad.service.js';
import { generarCodigosAcceso, normalizarCodigo } from './codigos-acceso.util.js';

function estadoBlockchain(validaciones) {
  if (!validaciones?.length) return 'PENDIENTE';
  if (validaciones.some((item) => item.estadoBlockchain === 'ALTERADO')) return 'ALTERADO';
  if (validaciones.some((item) => item.estadoBlockchain === 'NO_ENCONTRADO')) return 'NO_ENCONTRADO';
  if (validaciones.every((item) => ['VERIFICADO', 'VERIFICADO_CORREGIDO'].includes(item.estadoBlockchain))) {
    return validaciones.some((item) => item.estadoBlockchain === 'VERIFICADO_CORREGIDO')
      ? 'VERIFICADO_CORREGIDO'
      : 'VERIFICADO';
  }
  return 'PENDIENTE';
}

function buscarValidacion(validaciones, tipoEvento, idEntidad) {
  return validaciones.find((item) => (
    item.tipoEvento === tipoEvento && String(item.idEntidad) === String(idEntidad)
  )) || null;
}

function validacionResumen(validacion) {
  return validacion
    ? {
        estado: validacion.estadoBlockchain || 'PENDIENTE',
        valido: Boolean(validacion.valido),
        mensaje: validacion.mensaje || '',
        hashActual: validacion.hashActual || null,
        hashBlockchain: validacion.hashBlockchain || null
      }
    : {
        estado: 'PENDIENTE',
        valido: false,
        mensaje: 'Evento pendiente de validacion blockchain',
        hashActual: null,
        hashBlockchain: null
      };
}

function evento({ tipo, titulo, fecha, estado, descripcion, datos, validacion, incluirHashes = false }) {
  const blockchain = validacionResumen(validacion);
  if (!incluirHashes) {
    delete blockchain.hashActual;
    delete blockchain.hashBlockchain;
  }

  return {
    tipo,
    titulo,
    fecha,
    estado,
    descripcion,
    datos: datos.filter((item) => item.valor !== undefined && item.valor !== null && item.valor !== ''),
    blockchain
  };
}

function recepcionDeInspeccion(data, inspeccion) {
  return (data.recepciones || []).find((item) => item.id === inspeccion.recepcion_id) || null;
}

function construirEventos(data, nivel = 'consumidor') {
  const validaciones = data.validacionesBlockchain || [];
  const eventos = [];
  const incluirProveedor = nivel !== 'consumidor';
  const incluirTransporte = nivel !== 'consumidor';
  const incluirResponsables = nivel === 'auditoria';
  const incluirHashes = nivel === 'auditoria';

  for (const recepcion of data.recepciones || []) {
    eventos.push(evento({
      tipo: 'recepcion_materia_prima',
      titulo: 'Recepcion de materia prima',
      fecha: recepcion.fecha_recepcion,
      estado: recepcion.estado_recepcion,
      descripcion: 'Ingreso de materia prima al sistema de trazabilidad.',
      validacion: buscarValidacion(validaciones, 'recepcion_materia_prima', recepcion.id),
      incluirHashes,
      datos: [
        { etiqueta: 'Materia prima', valor: recepcion.materia_prima },
        { etiqueta: 'Lote', valor: recepcion.numero_lote || recepcion.lote_proveedor },
        { etiqueta: 'Proveedor', valor: incluirProveedor ? recepcion.proveedor?.nombre : null },
        { etiqueta: 'Cantidad recibida', valor: nivel === 'auditoria' ? `${recepcion.cantidad || '-'} ${recepcion.unidad_medida || recepcion.unidad_presentacion || ''}`.trim() : null },
        { etiqueta: 'Recibido por', valor: incluirResponsables ? recepcion.recibido_por : null }
      ]
    }));
  }

  for (const inspeccion of data.inspecciones || []) {
    const recepcion = recepcionDeInspeccion(data, inspeccion);
    eventos.push(evento({
      tipo: 'inspeccion_recepcion',
      titulo: 'Inspeccion de materia prima',
      fecha: inspeccion.inspeccionado_en,
      estado: inspeccion.decision_final,
      descripcion: 'Revision de condiciones del producto recibido y del transporte.',
      validacion: buscarValidacion(validaciones, 'inspeccion_recepcion', inspeccion.id),
      incluirHashes,
      datos: [
        { etiqueta: 'Materia prima', valor: recepcion?.materia_prima },
        { etiqueta: 'Lote', valor: recepcion?.numero_lote || recepcion?.lote_proveedor },
        { etiqueta: 'Resultado', valor: inspeccion.decision_final },
        { etiqueta: 'Producto conforme', valor: inspeccion.olor && inspeccion.color && inspeccion.textura ? 'Si' : 'Con observaciones' },
        { etiqueta: 'Transporte conforme', valor: incluirTransporte ? (inspeccion.condiciones_vehiculo && inspeccion.higiene_conductor ? 'Si' : 'Con observaciones') : null },
        { etiqueta: 'Inspeccionado por', valor: incluirResponsables ? inspeccion.inspeccionado_por : null }
      ]
    }));
  }

  const orden = data.produccion?.orden;
  const producto = data.produccion?.productos?.[0];
  if (orden) {
    eventos.push(evento({
      tipo: 'orden_produccion',
      titulo: 'Orden de produccion',
      fecha: orden.fecha_produccion,
      estado: orden.estado,
      descripcion: 'Planificacion del lote producido y sus cantidades programadas.',
      validacion: buscarValidacion(validaciones, 'orden_produccion', orden.id),
      incluirHashes,
      datos: [
        { etiqueta: 'Orden', valor: nivel === 'consumidor' ? null : orden.codigo_orden },
        { etiqueta: 'Producto', valor: producto?.producto },
        { etiqueta: 'Presentacion', valor: producto?.tamano_presentacion },
        { etiqueta: 'Cantidad programada', valor: nivel === 'auditoria' ? producto?.cantidad_programada : null }
      ]
    }));
  }

  const manufactura = data.produccion?.manufactura;
  if (manufactura) {
    eventos.push(evento({
      tipo: 'registro_manufactura',
      titulo: 'Registro de manufactura',
      fecha: manufactura.hora_inicio || manufactura.created_at,
      estado: 'registrado',
      descripcion: 'Registro real de la fabricacion del lote terminado.',
      validacion: buscarValidacion(validaciones, 'registro_manufactura', manufactura.id_manufactura),
      incluirHashes,
      datos: [
        { etiqueta: 'Lote producido', valor: manufactura.lote_producido },
        { etiqueta: 'Unidades producidas', valor: nivel !== 'consumidor' ? manufactura.unidades_producidas : null },
        { etiqueta: 'Inicio', valor: nivel === 'auditoria' ? manufactura.hora_inicio : null },
        { etiqueta: 'Fin', valor: nivel === 'auditoria' ? manufactura.hora_fin : null },
        { etiqueta: 'Responsable', valor: incluirResponsables ? manufactura.registrado_por : null }
      ]
    }));
  }

  const liberacion = data.liberacion;
  if (liberacion) {
    eventos.push(evento({
      tipo: 'liberacion_producto',
      titulo: 'Liberacion y salida del producto',
      fecha: liberacion.fecha_liberacion || liberacion.created_at,
      estado: liberacion.estado_liberacion,
      descripcion: 'Control final del producto terminado antes de su entrega.',
      validacion: buscarValidacion(validaciones, 'liberacion_producto', liberacion.id_liberacion),
      incluirHashes,
      datos: [
        { etiqueta: 'Unidades liberadas', valor: nivel !== 'consumidor' ? (liberacion.unidades_empacadas || liberacion.unidades_producidas) : null },
        { etiqueta: 'Fecha de vencimiento', valor: liberacion.fecha_vencimiento },
        { etiqueta: 'Empaque', valor: nivel !== 'consumidor' ? liberacion.tipo_empaque : null },
        { etiqueta: 'Factura', valor: incluirTransporte ? liberacion.numero_factura : null },
        { etiqueta: 'Conductor', valor: incluirTransporte ? liberacion.conductor : null },
        { etiqueta: 'Placa', valor: incluirTransporte ? liberacion.placa_vehiculo : null },
        { etiqueta: 'Responsable liberacion', valor: incluirResponsables ? liberacion.responsable_liberacion : null }
      ]
    }));
  }

  if (data.despachoBlockchain) {
    eventos.push(evento({
      tipo: 'despacho_producto',
      titulo: 'Despacho del producto',
      fecha: data.despachoBlockchain.fechaEvento || data.despachoBlockchain.timestampBlockchain,
      estado: data.despachoBlockchain.decisionChaincode?.estado || data.despachoBlockchain.estado,
      descripcion: 'Decision automatica del chaincode previa a la salida del lote.',
      incluirHashes,
      validacion: {
        estadoBlockchain: 'VERIFICADO',
        valido: true,
        mensaje: 'Despacho autorizado y registrado de forma inmutable',
        hashActual: data.despachoBlockchain.hashRegistro,
        hashBlockchain: data.despachoBlockchain.hashRegistro
      },
      datos: [
        { etiqueta: 'Lote', valor: data.despachoBlockchain.lote },
        { etiqueta: 'Decision', valor: data.despachoBlockchain.decisionChaincode?.estado || 'APROBADO' },
        { etiqueta: 'Transaccion Fabric', valor: nivel === 'auditoria' ? data.despachoBlockchain.txId : null }
      ]
    }));
  }

  if (data.confirmacionCliente) {
    eventos.push(evento({
      tipo: 'confirmacion_recepcion_cliente',
      titulo: 'Recepcion confirmada por el cliente',
      fecha: data.confirmacionCliente.fechaConfirmacion || data.confirmacionCliente.fechaEvento,
      estado: data.confirmacionCliente.estado,
      descripcion: 'El cliente receptor confirmo la entrega del lote mediante acceso controlado.',
      incluirHashes,
      validacion: {
        estadoBlockchain: 'VERIFICADO',
        valido: true,
        mensaje: 'Confirmacion registrada de forma inmutable',
        hashActual: data.confirmacionCliente.hashRegistro,
        hashBlockchain: data.confirmacionCliente.hashRegistro
      },
      datos: [
        { etiqueta: 'Lote', valor: data.confirmacionCliente.lote },
        { etiqueta: 'Fecha de confirmacion', valor: data.confirmacionCliente.fechaConfirmacion || data.confirmacionCliente.fechaEvento },
        { etiqueta: 'Transaccion Fabric', valor: nivel === 'auditoria' ? data.confirmacionCliente.txId : null }
      ]
    }));
  }

  return eventos;
}

function construirBasePublica(data) {
  const productoPrincipal = data.produccion?.productos?.[0] || null;
  const manufactura = data.produccion?.manufactura || null;
  const liberacion = data.liberacion || null;

  return {
    lote: data.lote,
    loteConsultado: data.loteConsultado,
    producto: productoPrincipal
      ? {
          nombre: productoPrincipal.producto,
          tamano_presentacion: productoPrincipal.tamano_presentacion
        }
      : null,
    manufactura: manufactura
      ? {
          lote_producido: manufactura.lote_producido,
          fecha_inicio: manufactura.hora_inicio,
          fecha_fin: manufactura.hora_fin
        }
      : null,
    liberacion: liberacion
      ? {
          estado_liberacion: liberacion.estado_liberacion,
          fecha_liberacion: liberacion.fecha_liberacion || liberacion.created_at,
          fecha_vencimiento: liberacion.fecha_vencimiento
        }
      : null,
    blockchain: {
      estado: estadoBlockchain(data.validacionesBlockchain || []),
      eventos_verificados: (data.validacionesBlockchain || []).filter((item) => (
        ['VERIFICADO', 'VERIFICADO_CORREGIDO'].includes(item.estadoBlockchain)
      )).length,
      eventos_totales: (data.validacionesBlockchain || []).length
    },
    confirmacionCliente: data.confirmacionCliente
      ? {
          confirmado: true,
          estado: data.confirmacionCliente.estado,
          fechaConfirmacion: data.confirmacionCliente.fechaConfirmacion || data.confirmacionCliente.fechaEvento
        }
      : {
          confirmado: false,
          estado: 'PENDIENTE_RECEPCION'
        }
  };
}

export function autorizarCredencialesCliente(data, { factura, codigo }) {
  const codigos = generarCodigosAcceso(data);
  const facturaEsperada = normalizarCodigo(data.liberacion?.numero_factura);
  const facturaRecibida = normalizarCodigo(factura);
  const codigoRecibido = normalizarCodigo(codigo);
  return {
    autorizado: Boolean(
      (facturaEsperada && facturaRecibida && facturaEsperada === facturaRecibida) ||
      (codigoRecibido && codigoRecibido === normalizarCodigo(codigos.cliente))
    ),
    facturaEsperada,
    codigoEsperado: codigos.cliente
  };
}

export async function consultarTrazabilidadPublicaPorLote(lote) {
  const data = await consultarTrazabilidadPorLote(lote);
  return {
    ...construirBasePublica(data),
    alcance: 'consumidor_final',
    origenes: (data.recepciones || []).map((recepcion) => ({
      materia_prima: recepcion.materia_prima,
      lote: recepcion.numero_lote || recepcion.lote_proveedor,
      estado_recepcion: recepcion.estado_recepcion
    })),
    eventos: construirEventos(data, 'consumidor')
  };
}

export async function consultarTrazabilidadCliente({ lote, factura, codigo }) {
  if (!lote) throw new ErrorHttp(400, 'Debes indicar el lote a consultar');
  if (!factura && !codigo) throw new ErrorHttp(400, 'Debes indicar la factura o el codigo de cliente');

  const data = await consultarTrazabilidadPorLote(lote);
  const codigos = generarCodigosAcceso(data);
  const autorizacion = autorizarCredencialesCliente(data, { factura, codigo });

  if (!autorizacion.autorizado) {
    throw new ErrorHttp(403, 'Factura o codigo de cliente no valido para este lote');
  }

  return {
    ...construirBasePublica(data),
    alcance: 'cliente_receptor',
    factura: data.liberacion?.numero_factura || null,
    codigo_verificacion: codigos.cliente,
    despacho_liberacion: data.liberacion
      ? {
          fecha_liberacion: data.liberacion.fecha_liberacion || data.liberacion.created_at,
          estado_liberacion: data.liberacion.estado_liberacion,
          unidades_empacadas: data.liberacion.unidades_empacadas,
          tipo_empaque: data.liberacion.tipo_empaque,
          numero_factura: data.liberacion.numero_factura,
          conductor: data.liberacion.conductor,
          placa_vehiculo: data.liberacion.placa_vehiculo,
          limpieza_vehiculo: data.liberacion.limpieza_vehiculo,
          documentacion_dotacion: data.liberacion.documentacion_dotacion
        }
      : null,
    origenes: (data.recepciones || []).map((recepcion) => ({
      materia_prima: recepcion.materia_prima,
      lote: recepcion.numero_lote || recepcion.lote_proveedor,
      proveedor: recepcion.proveedor?.nombre || null,
      estado_recepcion: recepcion.estado_recepcion
    })),
    eventos: construirEventos(data, 'cliente')
  };
}

export async function confirmarRecepcionClienteService(datos, deps = {
  consultarTrazabilidadPorLote,
  confirmarRecepcionEnFabric
}) {
  const lote = String(datos.lote || '').trim();
  const receptor = String(datos.receptor || '').trim();
  if (!lote) throw new ErrorHttp(400, 'Debes indicar el lote');
  if (!datos.factura && !datos.codigo) throw new ErrorHttp(400, 'Debes indicar la factura o el codigo de cliente');
  if (receptor.length < 2) throw new ErrorHttp(400, 'Debes identificar a la persona que recibe');

  const fechaRecepcion = datos.fecha_recepcion || new Date().toISOString();
  if (Number.isNaN(Date.parse(fechaRecepcion))) {
    throw new ErrorHttp(400, 'La fecha de recepcion no es valida');
  }

  const data = await deps.consultarTrazabilidadPorLote(lote);
  const autorizacion = autorizarCredencialesCliente(data, {
    factura: datos.factura,
    codigo: datos.codigo
  });
  if (!autorizacion.autorizado) {
    throw new ErrorHttp(403, 'Factura o codigo de cliente no valido para este lote');
  }
  if (data.liberacion?.estado_liberacion !== 'aprobado') {
    throw new ErrorHttp(409, 'El lote no tiene un despacho aprobado para confirmar');
  }

  try {
    const confirmation = await deps.confirmarRecepcionEnFabric({
      lote: data.lote,
      numeroFactura: data.liberacion.numero_factura,
      codigoCliente: datos.codigo || autorizacion.codigoEsperado,
      fechaRecepcion: new Date(fechaRecepcion).toISOString(),
      actor: receptor,
      observaciones: String(datos.observaciones || '')
    });
    return {
      confirmado: true,
      estado: confirmation.estado || 'RECIBIDO_POR_CLIENTE',
      lote: data.lote,
      fechaConfirmacion: confirmation.fechaConfirmacion || fechaRecepcion,
      transactionId: confirmation.transactionId || confirmation.txId || null
    };
  } catch (error) {
    if (error?.name === 'ErrorOperacionFabric') {
      throw new ErrorHttp(error.status || 503, error.message, { codigo: error.codigo });
    }
    throw error;
  }
}

export async function consultarTrazabilidadAuditoria({ lote, codigo }) {
  if (!lote) throw new ErrorHttp(400, 'Debes indicar el lote a consultar');
  if (!codigo) throw new ErrorHttp(400, 'Debes indicar el codigo de auditoria');

  const data = await consultarTrazabilidadPorLote(lote);
  const codigos = generarCodigosAcceso(data);

  if (normalizarCodigo(codigo) !== normalizarCodigo(codigos.auditoria)) {
    throw new ErrorHttp(403, 'Codigo de auditoria no valido para este lote');
  }

  return {
    ...construirBasePublica(data),
    alcance: 'auditoria_invima',
    codigo_verificacion: codigos.auditoria,
    proveedor: data.proveedor,
    recepciones: data.recepciones,
    inspecciones: data.inspecciones,
    produccion: data.produccion,
    liberacion: data.liberacion,
    validacionesBlockchain: data.validacionesBlockchain,
    decisionesBlockchain: data.decisionesBlockchain,
    historialCorrecciones: data.historialCorrecciones,
    alertasVencimiento: data.alertasVencimiento,
    eventos: construirEventos(data, 'auditoria')
  };
}
