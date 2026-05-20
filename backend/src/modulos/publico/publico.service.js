import { consultarTrazabilidadPorLote } from '../trazabilidad/trazabilidad.service.js';

function estadoBlockchain(validaciones) {
  if (!validaciones?.length) return 'PENDIENTE';
  if (validaciones.some((item) => item.estadoBlockchain === 'ALTERADO')) return 'ALTERADO';
  if (validaciones.some((item) => item.estadoBlockchain === 'NO_ENCONTRADO')) return 'NO_ENCONTRADO';
  if (validaciones.every((item) => item.estadoBlockchain === 'VERIFICADO')) return 'VERIFICADO';
  return 'PENDIENTE';
}

function buscarValidacion(validaciones, tipoEvento, idEntidad) {
  return validaciones.find((item) => (
    item.tipoEvento === tipoEvento && String(item.idEntidad) === String(idEntidad)
  )) || null;
}

function eventoPublico({ tipo, titulo, fecha, estado, descripcion, datos, validacion }) {
  return {
    tipo,
    titulo,
    fecha,
    estado,
    descripcion,
    datos: datos.filter((item) => item.valor !== undefined && item.valor !== null && item.valor !== ''),
    blockchain: validacion
      ? {
          estado: validacion.estadoBlockchain || 'PENDIENTE',
          valido: Boolean(validacion.valido),
          mensaje: validacion.mensaje || ''
        }
      : {
          estado: 'PENDIENTE',
          valido: false,
          mensaje: 'Evento pendiente de validacion blockchain'
        }
  };
}

function construirEventosPublicos(data) {
  const validaciones = data.validacionesBlockchain || [];
  const eventos = [];

  for (const recepcion of data.recepciones || []) {
    eventos.push(eventoPublico({
      tipo: 'recepcion_materia_prima',
      titulo: 'Recepcion de materia prima',
      fecha: recepcion.fecha_recepcion,
      estado: recepcion.estado_recepcion,
      descripcion: 'Ingreso de materia prima al sistema de trazabilidad.',
      validacion: buscarValidacion(validaciones, 'recepcion_materia_prima', recepcion.id),
      datos: [
        { etiqueta: 'Materia prima', valor: recepcion.materia_prima },
        { etiqueta: 'Lote', valor: recepcion.numero_lote || recepcion.lote_proveedor },
        { etiqueta: 'Proveedor', valor: recepcion.proveedor?.nombre },
        { etiqueta: 'Cantidad recibida', valor: `${recepcion.cantidad || '-'} ${recepcion.unidad_medida || recepcion.unidad_presentacion || ''}`.trim() }
      ]
    }));
  }

  for (const inspeccion of data.inspecciones || []) {
    const recepcion = (data.recepciones || []).find((item) => item.id === inspeccion.recepcion_id);
    eventos.push(eventoPublico({
      tipo: 'inspeccion_recepcion',
      titulo: 'Inspeccion de materia prima',
      fecha: inspeccion.inspeccionado_en,
      estado: inspeccion.decision_final,
      descripcion: 'Revision de condiciones del producto recibido y del transporte.',
      validacion: buscarValidacion(validaciones, 'inspeccion_recepcion', inspeccion.id),
      datos: [
        { etiqueta: 'Materia prima', valor: recepcion?.materia_prima },
        { etiqueta: 'Lote', valor: recepcion?.numero_lote || recepcion?.lote_proveedor },
        { etiqueta: 'Resultado', valor: inspeccion.decision_final },
        { etiqueta: 'Producto conforme', valor: inspeccion.olor && inspeccion.color && inspeccion.textura ? 'Si' : 'Con observaciones' },
        { etiqueta: 'Transporte conforme', valor: inspeccion.condiciones_vehiculo && inspeccion.higiene_conductor ? 'Si' : 'Con observaciones' }
      ]
    }));
  }

  const orden = data.produccion?.orden;
  const producto = data.produccion?.productos?.[0];
  if (orden) {
    eventos.push(eventoPublico({
      tipo: 'orden_produccion',
      titulo: 'Orden de produccion',
      fecha: orden.fecha_produccion,
      estado: orden.estado,
      descripcion: 'Planificacion del lote producido y sus cantidades programadas.',
      validacion: buscarValidacion(validaciones, 'orden_produccion', orden.id),
      datos: [
        { etiqueta: 'Orden', valor: orden.codigo_orden },
        { etiqueta: 'Producto', valor: producto?.producto },
        { etiqueta: 'Presentacion', valor: producto?.tamano_presentacion },
        { etiqueta: 'Cantidad programada', valor: producto?.cantidad_programada }
      ]
    }));
  }

  const manufactura = data.produccion?.manufactura;
  if (manufactura) {
    eventos.push(eventoPublico({
      tipo: 'registro_manufactura',
      titulo: 'Registro de manufactura',
      fecha: manufactura.hora_inicio || manufactura.created_at,
      estado: 'registrado',
      descripcion: 'Registro real de la fabricacion del lote terminado.',
      validacion: buscarValidacion(validaciones, 'registro_manufactura', manufactura.id_manufactura),
      datos: [
        { etiqueta: 'Lote producido', valor: manufactura.lote_producido },
        { etiqueta: 'Unidades producidas', valor: manufactura.unidades_producidas },
        { etiqueta: 'Inicio', valor: manufactura.hora_inicio },
        { etiqueta: 'Fin', valor: manufactura.hora_fin }
      ]
    }));
  }

  const liberacion = data.liberacion;
  if (liberacion) {
    eventos.push(eventoPublico({
      tipo: 'liberacion_producto',
      titulo: 'Liberacion y salida del producto',
      fecha: liberacion.fecha_liberacion || liberacion.created_at,
      estado: liberacion.estado_liberacion,
      descripcion: 'Control final del producto terminado antes de su entrega.',
      validacion: buscarValidacion(validaciones, 'liberacion_producto', liberacion.id_liberacion),
      datos: [
        { etiqueta: 'Unidades liberadas', valor: liberacion.unidades_empacadas || liberacion.unidades_producidas },
        { etiqueta: 'Fecha de vencimiento', valor: liberacion.fecha_vencimiento },
        { etiqueta: 'Empaque', valor: liberacion.tipo_empaque },
        { etiqueta: 'Factura', valor: liberacion.numero_factura },
        { etiqueta: 'Conductor', valor: liberacion.conductor },
        { etiqueta: 'Placa', valor: liberacion.placa_vehiculo }
      ]
    }));
  }

  return eventos;
}

export async function consultarTrazabilidadPublicaPorLote(lote) {
  const data = await consultarTrazabilidadPorLote(lote);
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
          unidades_producidas: manufactura.unidades_producidas,
          fecha_inicio: manufactura.hora_inicio,
          fecha_fin: manufactura.hora_fin
        }
      : null,
    liberacion: liberacion
      ? {
          estado_liberacion: liberacion.estado_liberacion,
          fecha_liberacion: liberacion.fecha_liberacion || liberacion.created_at,
          unidades_empacadas: liberacion.unidades_empacadas,
          fecha_vencimiento: liberacion.fecha_vencimiento,
          tipo_empaque: liberacion.tipo_empaque
        }
      : null,
    origenes: (data.recepciones || []).map((recepcion) => ({
      materia_prima: recepcion.materia_prima,
      lote: recepcion.numero_lote || recepcion.lote_proveedor,
      proveedor: recepcion.proveedor?.nombre || null,
      estado_recepcion: recepcion.estado_recepcion
    })),
    eventos: construirEventosPublicos(data),
    blockchain: {
      estado: estadoBlockchain(data.validacionesBlockchain || []),
      eventos_verificados: (data.validacionesBlockchain || []).filter((item) => item.estadoBlockchain === 'VERIFICADO').length,
      eventos_totales: (data.validacionesBlockchain || []).length
    }
  };
}
