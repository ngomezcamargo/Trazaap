import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { consultarTrazabilidadPorLote } from '../trazabilidad/trazabilidad.service.js';
import {
  buscarDespachoCliente,
  registrarConfirmacionEntregaService
} from '../despachos/despachos.service.js';
import { generarCodigoClienteDespacho, generarCodigosAcceso, normalizarCodigo } from './codigos-acceso.util.js';

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

  const almacenamiento = data.almacenamiento;
  if (almacenamiento) {
    const controles = almacenamiento.controles || [];
    const conforme = ['listo_para_liberacion', 'liberado', 'despacho_parcial', 'despachado'].includes(almacenamiento.estado);
    eventos.push(evento({
      tipo: 'ingreso_almacenamiento',
      titulo: 'Ingreso a almacenamiento',
      fecha: almacenamiento.fecha_ingreso,
      estado: almacenamiento.estado,
      descripcion: 'Conservacion controlada del lote antes de su liberacion.',
      validacion: buscarValidacion(validaciones, 'ingreso_almacenamiento', almacenamiento.id_almacenamiento),
      incluirHashes,
      datos: [
        { etiqueta: 'Condiciones', valor: almacenamiento.condiciones_almacenamiento || 'Conservacion segun ficha tecnica' },
        { etiqueta: 'Resultado', valor: conforme ? 'Conforme' : 'En seguimiento' },
        { etiqueta: 'Ubicacion', valor: incluirResponsables ? almacenamiento.ubicacion : null },
        { etiqueta: 'Rango esperado', valor: nivel !== 'consumidor' ? `${almacenamiento.temperatura_min_esperada_c} a ${almacenamiento.temperatura_max_esperada_c} C` : null },
        { etiqueta: 'Temperatura de ingreso', valor: nivel === 'auditoria' ? `${almacenamiento.temperatura_ingreso_c} C` : null },
        { etiqueta: 'Responsable', valor: incluirResponsables ? almacenamiento.responsable_ingreso_email : null },
        { etiqueta: 'Observaciones', valor: incluirResponsables ? almacenamiento.observaciones_ingreso : null }
      ]
    }));

    for (const control of controles) {
      eventos.push(evento({
        tipo: 'control_almacenamiento',
        titulo: 'Control de almacenamiento',
        fecha: control.fecha_control,
        estado: control.resultado,
        descripcion: 'Verificacion periodica de las condiciones de conservacion.',
        validacion: buscarValidacion(validaciones, 'control_almacenamiento', control.id_control),
        incluirHashes,
        datos: [
          { etiqueta: 'Resultado', valor: control.resultado === 'conforme' ? 'Conforme' : 'Fuera de rango' },
          { etiqueta: 'Condicion general', valor: nivel !== 'consumidor' ? control.condicion_general : null },
          { etiqueta: 'Temperatura', valor: nivel === 'auditoria' ? `${control.temperatura_c} C` : null },
          { etiqueta: 'Responsable', valor: incluirResponsables ? control.responsable_control_email : null },
          { etiqueta: 'Observaciones', valor: incluirResponsables ? control.observaciones : null }
        ]
      }));
    }

    if (almacenamiento.fecha_salida) {
      eventos.push(evento({
        tipo: 'salida_almacenamiento',
        titulo: 'Salida de almacenamiento',
        fecha: almacenamiento.fecha_salida,
        estado: almacenamiento.decision_salida,
        descripcion: 'Decision de salida del lote hacia liberacion de producto.',
        validacion: buscarValidacion(validaciones, 'salida_almacenamiento', almacenamiento.id_almacenamiento),
        incluirHashes,
        datos: [
          { etiqueta: 'Decision', valor: almacenamiento.decision_salida },
          { etiqueta: 'Estado del producto', valor: almacenamiento.estado_producto_salida },
          { etiqueta: 'Temperatura de salida', valor: nivel === 'auditoria' ? `${almacenamiento.temperatura_salida_c} C` : null },
          { etiqueta: 'Responsable', valor: incluirResponsables ? almacenamiento.responsable_salida_email : null },
          { etiqueta: 'Observaciones', valor: incluirResponsables ? almacenamiento.observaciones_salida : null }
        ]
      }));
    }
  }

  const liberacion = data.liberacion;
  if (liberacion) {
    eventos.push(evento({
      tipo: 'liberacion_producto',
      titulo: 'Liberacion del producto',
      fecha: liberacion.fecha_liberacion || liberacion.created_at,
      estado: liberacion.estado_liberacion,
      descripcion: 'Control final que habilita el producto para ingresar al inventario terminado.',
      validacion: buscarValidacion(validaciones, 'liberacion_producto', liberacion.id_liberacion),
      incluirHashes,
      datos: [
        { etiqueta: 'Unidades liberadas', valor: nivel !== 'consumidor' ? (liberacion.unidades_empacadas || liberacion.unidades_producidas) : null },
        { etiqueta: 'Fecha de vencimiento', valor: liberacion.fecha_vencimiento },
        { etiqueta: 'Empaque', valor: nivel !== 'consumidor' ? liberacion.tipo_empaque : null },
        { etiqueta: 'Responsable liberacion', valor: incluirResponsables ? liberacion.responsable_liberacion : null }
      ]
    }));
  }

  for (const despacho of data.despachos || []) {
    const cantidad = (despacho.detalles || [])
      .filter((detalle) => String(detalle.lote) === String(data.lote))
      .reduce((total, detalle) => total + Number(detalle.cantidad_despachada || 0), 0);
    const evidencia = despacho.blockchain || null;
    eventos.push(evento({
      tipo: 'despacho_producto',
      titulo: 'Despacho del producto',
      fecha: despacho.fecha_despacho,
      estado: despacho.estado_despacho,
      descripcion: 'Salida parcial o total del lote, validada contra las existencias disponibles.',
      incluirHashes,
      validacion: evidencia
        ? {
            estadoBlockchain: 'VERIFICADO',
            valido: true,
            mensaje: 'Despacho autorizado y registrado de forma inmutable',
            hashActual: evidencia.hashRegistro,
            hashBlockchain: evidencia.hashRegistro
          }
        : buscarValidacion(validaciones, 'despacho_producto', despacho.id_despacho),
      datos: [
        { etiqueta: 'Despacho', valor: nivel !== 'consumidor' ? despacho.codigo_despacho : null },
        { etiqueta: 'Cantidad despachada', valor: cantidad },
        { etiqueta: 'Cliente', valor: nivel !== 'consumidor' ? despacho.cliente : null },
        { etiqueta: 'Factura', valor: nivel !== 'consumidor' ? despacho.numero_factura : null },
        { etiqueta: 'Conductor', valor: incluirTransporte ? despacho.conductor : null },
        { etiqueta: 'Placa', valor: incluirTransporte ? despacho.placa_vehiculo : null },
        { etiqueta: 'Transaccion Fabric', valor: nivel === 'auditoria' ? evidencia?.txId : null }
      ]
    }));

    if (despacho.id_confirmacion) {
      const confirmacionFabric = despacho.confirmacionBlockchain || null;
      eventos.push(evento({
        tipo: 'confirmacion_recepcion_cliente',
        titulo: 'Recepcion confirmada por el cliente',
        fecha: despacho.fecha_recepcion,
        estado: despacho.estado_confirmacion,
        descripcion: 'El cliente receptor confirmo este despacho mediante acceso controlado.',
        incluirHashes,
        validacion: confirmacionFabric
          ? {
              estadoBlockchain: 'VERIFICADO',
              valido: true,
              mensaje: 'Confirmacion registrada de forma inmutable',
              hashActual: confirmacionFabric.hashRegistro,
              hashBlockchain: confirmacionFabric.hashRegistro
            }
          : buscarValidacion(validaciones, 'confirmacion_recepcion_cliente', despacho.id_despacho),
        datos: [
          { etiqueta: 'Despacho', valor: nivel !== 'consumidor' ? despacho.codigo_despacho : null },
          { etiqueta: 'Fecha de confirmacion', valor: despacho.fecha_recepcion },
          { etiqueta: 'Receptor', valor: nivel !== 'consumidor' ? despacho.receptor : null },
          { etiqueta: 'Transaccion Fabric', valor: nivel === 'auditoria' ? confirmacionFabric?.txId : null }
        ]
      }));
    }
  }

  return eventos;
}

function construirBasePublica(data) {
  const productoPrincipal = data.produccion?.productos?.[0] || null;
  const manufactura = data.produccion?.manufactura || null;
  const liberacion = data.liberacion || null;
  const almacenamiento = data.almacenamiento || null;

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
    almacenamiento: almacenamiento
      ? {
          estado: almacenamiento.estado,
          fecha_ingreso: almacenamiento.fecha_ingreso,
          fecha_salida: almacenamiento.fecha_salida,
          condiciones: almacenamiento.condiciones_almacenamiento || 'Conservacion segun ficha tecnica',
          controles_registrados: (almacenamiento.controles || []).length,
          conservacion_conforme: ['listo_para_liberacion', 'despachado'].includes(almacenamiento.estado)
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
  const despacho = await buscarDespachoCliente({ lote, factura, codigo });
  if (!despacho) {
    throw new ErrorHttp(403, 'Factura o codigo de cliente no valido para este lote');
  }
  const codigoCliente = despacho.es_heredado ? null : generarCodigoClienteDespacho(despacho);

  return {
    ...construirBasePublica(data),
    alcance: 'cliente_receptor',
    factura: despacho.numero_factura,
    codigo_verificacion: codigoCliente,
    despacho_liberacion: {
      id_despacho: despacho.id_despacho,
      codigo_despacho: despacho.codigo_despacho,
      fecha_despacho: despacho.fecha_despacho,
      fecha_entrega: despacho.fecha_entrega,
      estado_despacho: despacho.estado_despacho,
      numero_factura: despacho.numero_factura,
      conductor: despacho.conductor,
      placa_vehiculo: despacho.placa_vehiculo,
      temperatura_salida_c: despacho.temperatura_salida_c,
      temperatura_transporte_c: despacho.temperatura_transporte_c,
      temperatura_entrega_c: despacho.temperatura_entrega_c,
      limpieza_vehiculo: despacho.limpieza_vehiculo,
      documentacion_dotacion: despacho.documentacion_dotacion,
      canal_distribucion: despacho.canal_distribucion,
      detalles: despacho.detalles.map((detalle) => ({
        lote: detalle.lote,
        producto: detalle.producto,
        cantidad_despachada: detalle.cantidad_despachada,
        fecha_vencimiento: detalle.fecha_vencimiento
      }))
    },
    cliente: despacho.cliente
      ? {
          nombre_razon_social: despacho.cliente,
          nombre_contacto: despacho.cliente_contacto
        }
      : null,
    confirmacionCliente: despacho.id_confirmacion
      ? {
          confirmado: despacho.estado_confirmacion === 'confirmada',
          estado: despacho.estado_confirmacion,
          fechaConfirmacion: despacho.fecha_recepcion,
          receptor: despacho.receptor
        }
      : { confirmado: false, estado: 'PENDIENTE_RECEPCION' },
    almacenamiento_detalle: data.almacenamiento
      ? {
          estado: data.almacenamiento.estado,
          fecha_ingreso: data.almacenamiento.fecha_ingreso,
          fecha_salida: data.almacenamiento.fecha_salida,
          condiciones: data.almacenamiento.condiciones_almacenamiento,
          temperatura_min_esperada_c: data.almacenamiento.temperatura_min_esperada_c,
          temperatura_max_esperada_c: data.almacenamiento.temperatura_max_esperada_c,
          controles: (data.almacenamiento.controles || []).map((control) => ({
            fecha_control: control.fecha_control,
            condicion_general: control.condicion_general,
            resultado: control.resultado
          }))
        }
      : null,
    origenes: (data.recepciones || []).map((recepcion) => ({
      materia_prima: recepcion.materia_prima,
      lote: recepcion.numero_lote || recepcion.lote_proveedor,
      proveedor: recepcion.proveedor?.nombre || null,
      estado_recepcion: recepcion.estado_recepcion
    })),
    eventos: construirEventos({ ...data, despachos: [despacho] }, 'cliente')
  };
}

export async function confirmarRecepcionClienteService(datos, deps = {
  buscarDespachoCliente,
  registrarConfirmacionEntregaService
}) {
  const lote = String(datos.lote || '').trim();
  let idDespacho = Number(datos.id_despacho);
  if (!idDespacho) {
    if (!lote) throw new ErrorHttp(400, 'Debes indicar el lote o el despacho');
    const despacho = await deps.buscarDespachoCliente({ lote, factura: datos.factura, codigo: datos.codigo });
    if (!despacho) throw new ErrorHttp(403, 'Factura o codigo de cliente no valido para este lote');
    idDespacho = Number(despacho.id_despacho);
  }

  return deps.registrarConfirmacionEntregaService({
    id_despacho: idDespacho,
    factura: String(datos.factura || ''),
    codigo: String(datos.codigo || ''),
    receptor: String(datos.receptor || '').trim(),
    temperatura_entrega_c: Number(datos.temperatura_entrega_c),
    observaciones: String(datos.observaciones || '')
  });
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
    almacenamiento: data.almacenamiento,
    liberacion: data.liberacion,
    despachos: data.despachos,
    validacionesBlockchain: data.validacionesBlockchain,
    decisionesBlockchain: data.decisionesBlockchain,
    historialCorrecciones: data.historialCorrecciones,
    alertasVencimiento: data.alertasVencimiento,
    eventos: construirEventos(data, 'auditoria')
  };
}
