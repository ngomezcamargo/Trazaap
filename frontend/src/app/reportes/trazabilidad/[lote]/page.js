'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { trazabilidadServicio } from '@/servicios/trazabilidad.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { ROLES } from '@/utilidades/roles';

const nombresEventos = {
  recepcion_materia_prima: 'RECEPCION DE MATERIA PRIMA',
  inspeccion_recepcion: 'INSPECCION DE MATERIA PRIMA',
  orden_produccion: 'ORDEN DE PRODUCCION',
  producto_fabricado_configurado: 'PRODUCTO / RECETA',
  registro_manufactura: 'FABRICACION',
  envasado_embalado: 'ENVASADO Y EMBALADO',
  devolucion_no_conformidad: 'DEVOLUCION / NO CONFORMIDAD',
  ingreso_almacenamiento: 'INGRESO A ALMACENAMIENTO',
  control_almacenamiento: 'CONTROL DE ALMACENAMIENTO',
  salida_almacenamiento: 'SALIDA DE ALMACENAMIENTO',
  liberacion_producto: 'EMBALADO / LIBERACION',
  inventario_producto_terminado: 'INVENTARIO PRODUCTO TERMINADO',
  inventario_materia_prima: 'INVENTARIO MATERIA PRIMA',
  movimiento_inventario: 'MOVIMIENTO DE INVENTARIO',
  despacho_producto: 'DESPACHO DE PRODUCTO',
  confirmacion_recepcion_cliente: 'CONFIRMACION DE RECEPCION DEL CLIENTE',
  correccion_evento: 'CORRECCION AUDITADA',
  alerta_vencimiento: 'ALERTA DE VENCIMIENTO'
};

function fechaCorta(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleString();
}

function hashCorto(hash) {
  if (!hash) return '-';
  return hash.length > 34 ? `${hash.slice(0, 24)}...${hash.slice(-8)}` : hash;
}

function estadoTexto(estado) {
  if (estado === 'VERIFICADO') return 'VERIFICADO';
  if (estado === 'VERIFICADO_CORREGIDO') return 'VERIFICADO CON CORRECCION';
  if (estado === 'ALTERADO') return 'ALTERADO';
  if (estado === 'NO_ENCONTRADO') return 'NO ENCONTRADO';
  return 'PENDIENTE';
}

function CodigoQrTrazabilidad({ url, descripcion }) {
  return <QRCodeSVG className="qr-imagen" value={url} size={240} level="M" marginSize={4} title={descripcion} />;
}

function obtenerValidacion(data, tipoEvento, idEntidad) {
  return (data.validacionesBlockchain || []).find((item) => (
    item.tipoEvento === tipoEvento && String(item.idEntidad) === String(idEntidad)
  )) || null;
}

function crearEventosReporte(data) {
  const eventos = [];

  for (const recepcion of data.recepciones || []) {
    eventos.push({
      tipoEvento: 'recepcion_materia_prima',
      idEntidad: recepcion.id,
      titulo: nombresEventos.recepcion_materia_prima,
      referencia: `Recepcion #${recepcion.id}`,
      lote: recepcion.numero_lote || recepcion.lote_proveedor,
      filas: [
        ['Materia prima', recepcion.materia_prima],
        ['Lote', recepcion.numero_lote || recepcion.lote_proveedor],
        ['Proveedor', recepcion.proveedor ? `${recepcion.proveedor.nombre} (${recepcion.proveedor.nit})` : '-'],
        ['Fecha y hora', fechaCorta(recepcion.fecha_recepcion)],
        ['Cantidad recibida', `${recepcion.cantidad || '-'} ${recepcion.unidad_medida || recepcion.unidad_presentacion || ''}`],
        ['Estado', recepcion.estado_recepcion || '-']
      ]
    });
  }

  for (const inspeccion of data.inspecciones || []) {
    const recepcion = (data.recepciones || []).find((item) => item.id === inspeccion.recepcion_id);
    eventos.push({
      tipoEvento: 'inspeccion_recepcion',
      idEntidad: inspeccion.id,
      titulo: nombresEventos.inspeccion_recepcion,
      referencia: `Inspeccion #${inspeccion.id}`,
      lote: recepcion?.numero_lote || recepcion?.lote_proveedor || data.lote,
      filas: [
        ['Referencia recepcion', recepcion ? `Recepcion #${recepcion.id}` : '-'],
        ['Materia prima', recepcion?.materia_prima || '-'],
        ['Resultado', inspeccion.decision_final || '-'],
        ['Fecha y hora', fechaCorta(inspeccion.inspeccionado_en)],
        ['Responsable', inspeccion.inspeccionado_por || '-']
      ]
    });
  }

  const orden = data.produccion?.orden;
  if (orden) {
    eventos.push({
      tipoEvento: 'orden_produccion',
      idEntidad: orden.id,
      titulo: nombresEventos.orden_produccion,
      referencia: `Orden ${orden.codigo_orden || `#${orden.id}`}`,
      lote: data.lote,
      filas: [
        ['Lote planificado', data.lote],
        ['Producto', (data.produccion?.productos || []).map((item) => item.producto).join(', ') || '-'],
        ['Cantidad planificada', (data.produccion?.productos || []).map((item) => `${item.cantidad_programada} ${item.producto}`).join(', ') || '-'],
        ['Fecha', fechaCorta(orden.fecha_produccion)],
        ['Estado', orden.estado || '-']
      ]
    });
  }

  for (const producto of data.produccion?.productos || []) {
    if (!producto.producto_fabricado_id) continue;
    eventos.push({
      tipoEvento: 'producto_fabricado_configurado',
      idEntidad: producto.producto_fabricado_id,
      titulo: nombresEventos.producto_fabricado_configurado,
      referencia: `Producto #${producto.producto_fabricado_id}`,
      lote: data.lote,
      filas: [
        ['Producto', producto.producto],
        ['Tamano / presentacion', producto.tamano_presentacion],
        ['Cantidad programada', producto.cantidad_programada],
        ['Estado manufactura', producto.estado_manufactura || '-']
      ]
    });
  }

  const manufactura = data.produccion?.manufactura;
  if (manufactura) {
    eventos.push({
      tipoEvento: 'registro_manufactura',
      idEntidad: manufactura.id_manufactura,
      titulo: nombresEventos.registro_manufactura,
      referencia: `Fabricacion #${manufactura.id_manufactura}`,
      lote: manufactura.lote_producido || data.lote,
      filas: [
        ['Lote producido', manufactura.lote_producido],
        ['Fecha y hora inicio', fechaCorta(manufactura.hora_inicio)],
        ['Fecha y hora fin', fechaCorta(manufactura.hora_fin)],
        ['Equipos utilizados', (manufactura.equipos_utilizados || []).join(', ') || '-'],
        ['Cantidad producida', manufactura.unidades_producidas],
        ['Responsable', manufactura.registrado_por || '-']
      ]
    });
  }

  const almacenamiento = data.almacenamiento;
  for (const caso of data.devoluciones || []) {
    eventos.push({ tipoEvento: 'devolucion_no_conformidad', idEntidad: caso.id_caso,
      titulo: nombresEventos.devolucion_no_conformidad, referencia: `Caso #${caso.id_caso}`, lote: caso.lote,
      filas: [['Tipo', caso.tipo_caso], ['Fecha', fechaCorta(caso.fecha_registro)], ['Cliente', caso.cliente || '-'], ['Despacho', caso.codigo_despacho || '-'], ['Cantidad', caso.cantidad], ['Motivo', caso.motivo], ['Accion', caso.accion], ['Responsable', caso.responsable_email], ['Impacto inventario', caso.impacto_inventario]] });
  }
  for (const envasado of data.envasados || []) {
    eventos.push({
      tipoEvento: 'envasado_embalado', idEntidad: envasado.id_envasado,
      titulo: nombresEventos.envasado_embalado, referencia: `Envasado #${envasado.id_envasado}`, lote: envasado.lote,
      filas: [['Fecha', fechaCorta(envasado.fecha_operacion)], ['Responsable', envasado.responsable_email], ['Operacion', envasado.descripcion_operacion], ['Resultado', envasado.resultado], ['Observaciones', envasado.observaciones || '-']]
    });
  }

  if (almacenamiento) {
    eventos.push({
      tipoEvento: 'ingreso_almacenamiento',
      idEntidad: almacenamiento.id_almacenamiento,
      titulo: nombresEventos.ingreso_almacenamiento,
      referencia: `Almacenamiento #${almacenamiento.id_almacenamiento}`,
      lote: almacenamiento.lote_producido || data.lote,
      filas: [
        ['Ubicacion', almacenamiento.ubicacion || '-'],
        ['Fecha de ingreso', fechaCorta(almacenamiento.fecha_ingreso)],
        ['Temperatura de ingreso', `${almacenamiento.temperatura_ingreso_c} C`],
        ['Rango esperado', `${almacenamiento.temperatura_min_esperada_c} a ${almacenamiento.temperatura_max_esperada_c} C`],
        ['Estado', almacenamiento.estado || '-'],
        ['Responsable', almacenamiento.responsable_ingreso_email || '-']
      ]
    });

    for (const control of almacenamiento.controles || []) {
      eventos.push({
        tipoEvento: 'control_almacenamiento',
        idEntidad: control.id_control,
        titulo: nombresEventos.control_almacenamiento,
        referencia: `Control #${control.id_control}`,
        lote: almacenamiento.lote_producido || data.lote,
        filas: [
          ['Fecha', fechaCorta(control.fecha_control)],
          ['Temperatura', `${control.temperatura_c} C`],
          ['Condicion general', control.condicion_general || '-'],
          ['Resultado', control.resultado || '-'],
          ['Observaciones', control.observaciones || '-'],
          ['Responsable', control.responsable_control_email || '-']
        ]
      });
    }

    if (almacenamiento.fecha_salida) {
      eventos.push({
        tipoEvento: 'salida_almacenamiento',
        idEntidad: almacenamiento.id_almacenamiento,
        titulo: nombresEventos.salida_almacenamiento,
        referencia: `Salida #${almacenamiento.id_almacenamiento}`,
        lote: almacenamiento.lote_producido || data.lote,
        filas: [
          ['Fecha de salida', fechaCorta(almacenamiento.fecha_salida)],
          ['Temperatura de salida', `${almacenamiento.temperatura_salida_c} C`],
          ['Estado del producto', almacenamiento.estado_producto_salida || '-'],
          ['Decision', almacenamiento.decision_salida || '-'],
          ['Observaciones', almacenamiento.observaciones_salida || '-'],
          ['Responsable', almacenamiento.responsable_salida_email || '-']
        ]
      });
    }
  }

  if (data.liberacion) {
    eventos.push({
      tipoEvento: 'liberacion_producto',
      idEntidad: data.liberacion.id_liberacion,
      titulo: nombresEventos.liberacion_producto,
      referencia: `Liberacion #${data.liberacion.id_liberacion}`,
      lote: data.liberacion.lote_producido || data.lote,
      filas: [
        ['Lote liberado', data.liberacion.lote_producido || data.lote],
        ['Fecha y hora', fechaCorta(data.liberacion.fecha_liberacion || data.liberacion.created_at)],
        ['Cantidad liberada', data.liberacion.unidades_empacadas || data.liberacion.unidades_producidas || '-'],
        ['Tipo de empaque', data.liberacion.tipo_empaque || '-'],
        ['Fecha de vencimiento', fechaCorta(data.liberacion.fecha_vencimiento)],
        ['Resultado', data.liberacion.estado_liberacion || '-']
      ]
    });
  }

  if (data.inventarioProductoTerminado) {
    eventos.push({
      tipoEvento: 'inventario_producto_terminado',
      idEntidad: data.inventarioProductoTerminado.id_inventario,
      titulo: nombresEventos.inventario_producto_terminado,
      referencia: `Inventario terminado #${data.inventarioProductoTerminado.id_inventario}`,
      lote: data.inventarioProductoTerminado.lote || data.lote,
      filas: [
        ['Producto', data.inventarioProductoTerminado.producto || '-'],
        ['Lote', data.inventarioProductoTerminado.lote || data.lote],
        ['Unidades liberadas', data.inventarioProductoTerminado.unidades_liberadas ?? '-'],
        ['Unidades reservadas', data.inventarioProductoTerminado.unidades_reservadas ?? '-'],
        ['Unidades despachadas', data.inventarioProductoTerminado.unidades_despachadas ?? '-'],
        ['Unidades disponibles', data.inventarioProductoTerminado.unidades_disponibles ?? '-'],
        ['Fecha de vencimiento', fechaCorta(data.inventarioProductoTerminado.fecha_vencimiento)],
        ['Estado', data.inventarioProductoTerminado.estado || '-']
      ]
    });
  }

  for (const despacho of data.despachos || []) {
    const detalles = (despacho.detalles || []).filter((detalle) => String(detalle.lote) === String(data.lote));
    const cantidad = detalles.reduce((total, detalle) => total + Number(detalle.cantidad_despachada || 0), 0);
    const evidencia = despacho.blockchain;
    eventos.push({
      tipoEvento: 'despacho_producto',
      idEntidad: despacho.id_despacho,
      titulo: nombresEventos.despacho_producto,
      referencia: despacho.codigo_despacho || `Despacho #${despacho.id_despacho}`,
      lote: data.lote,
      filas: [
        ['Cliente', despacho.cliente || 'No disponible en registro heredado'],
        ['Factura', despacho.numero_factura || '-'],
        ['Cantidad despachada de este lote', cantidad],
        ['Fecha y hora', fechaCorta(despacho.fecha_despacho)],
        ['Conductor', despacho.conductor || '-'],
        ['Placa', despacho.placa_vehiculo || '-'],
        ['Temperatura de salida', despacho.temperatura_salida_c == null ? '-' : `${despacho.temperatura_salida_c} C`],
        ['Temperatura de transporte', despacho.temperatura_transporte_c == null ? '-' : `${despacho.temperatura_transporte_c} C`],
        ['Estado', despacho.estado_despacho || '-']
      ],
      validacion: evidencia
        ? {
            estadoBlockchain: 'VERIFICADO',
            hashActual: evidencia.hashRegistro,
            hashBlockchain: evidencia.hashRegistro,
            mensaje: 'Saldo y condiciones del despacho validados por chaincode',
            transactionId: evidencia.txId,
            decision: evidencia.decisionChaincode?.estado || evidencia.estado,
            motivos: evidencia.decisionChaincode?.motivos || []
          }
        : obtenerValidacion(data, 'despacho_producto', despacho.id_despacho)
    });

    if (despacho.id_confirmacion) {
      const confirmacionFabric = despacho.confirmacionBlockchain;
      eventos.push({
        tipoEvento: 'confirmacion_recepcion_cliente',
        idEntidad: despacho.id_despacho,
        titulo: nombresEventos.confirmacion_recepcion_cliente,
        referencia: `Confirmacion de ${despacho.codigo_despacho}`,
        lote: data.lote,
        filas: [
          ['Cliente', despacho.cliente || '-'],
          ['Receptor', despacho.receptor || '-'],
          ['Fecha y hora', fechaCorta(despacho.fecha_recepcion)],
          ['Temperatura de entrega', despacho.temperatura_confirmada_c == null ? '-' : `${despacho.temperatura_confirmada_c} C`],
          ['Estado', despacho.estado_confirmacion || '-']
        ],
        validacion: confirmacionFabric
          ? {
              estadoBlockchain: 'VERIFICADO',
              hashActual: confirmacionFabric.hashRegistro,
              hashBlockchain: confirmacionFabric.hashRegistro,
              mensaje: 'Confirmacion del cliente registrada de forma inmutable',
              transactionId: confirmacionFabric.txId
            }
          : obtenerValidacion(data, 'confirmacion_recepcion_cliente', despacho.id_despacho)
      });
    }
  }

  for (const movimiento of data.movimientosInventario || []) {
    eventos.push({
      tipoEvento: 'movimiento_inventario',
      idEntidad: movimiento.id,
      titulo: nombresEventos.movimiento_inventario,
      referencia: `Movimiento #${movimiento.id}`,
      lote: data.lote,
      filas: [
        ['Materia prima', movimiento.materia_prima || '-'],
        ['Tipo movimiento', movimiento.tipo_movimiento || '-'],
        ['Cantidad', `${movimiento.cantidad || '-'} ${movimiento.unidad_medida || ''}`],
        ['Referencia', `${movimiento.referencia_tipo || '-'} #${movimiento.referencia_id || '-'}`],
        ['Creado por', movimiento.creado_por || '-'],
        ['Fecha', fechaCorta(movimiento.creado_en)]
      ]
    });
  }

  for (const inventario of data.inventariosMateriaPrima || []) {
    eventos.push({
      tipoEvento: 'inventario_materia_prima',
      idEntidad: inventario.id,
      titulo: nombresEventos.inventario_materia_prima,
      referencia: `Inventario materia prima #${inventario.id}`,
      lote: data.lote,
      filas: [
        ['Materia prima', inventario.materia_prima || '-'],
        ['Cantidad disponible', `${inventario.cantidad_disponible || '-'} ${inventario.unidad_medida || ''}`],
        ['Fecha actualizacion', fechaCorta(inventario.fecha_actualizacion)]
      ]
    });
  }

  for (const decision of (data.decisionesBlockchain || []).filter((item) => ![
    'despacho_producto',
    'confirmacion_recepcion_cliente'
  ].includes(item.tipoEvento))) {
    const motivos = decision.decisionChaincode?.motivos || [];
    eventos.push({
      tipoEvento: decision.tipoEvento,
      idEntidad: decision.idEntidad,
      titulo: nombresEventos[decision.tipoEvento] || decision.tipoEvento,
      referencia: `${decision.tipoEvento} ${decision.idEntidad}`,
      lote: decision.lote || data.lote,
      filas: [
        ['Lote', decision.lote || data.lote],
        ['Estado / decision', decision.decisionChaincode?.estado || decision.estado || '-'],
        ['Motivos', motivos.length ? motivos.join('; ') : 'Sin bloqueos'],
        ['Fecha Fabric', fechaCorta(decision.timestampBlockchain)],
        ['Transaccion Fabric', decision.txId || '-'],
        ...(decision.tipoEvento === 'correccion_evento'
          ? [
              ['Evento original', `${decision.tipoEventoOriginal}:${decision.idEntidadOriginal}`],
              ['Motivo de correccion', decision.motivoCorreccion || '-']
            ]
          : [])
      ],
      validacion: {
        estadoBlockchain: 'VERIFICADO',
        hashActual: decision.hashRegistro,
        hashBlockchain: decision.hashRegistro,
        mensaje: decision.tipoEvento === 'despacho_producto'
          ? 'Reglas de despacho validadas por chaincode'
          : 'Decision registrada de forma inmutable',
        transactionId: decision.txId,
        timestampBlockchain: decision.timestampBlockchain,
        decision: decision.decisionChaincode?.estado || decision.estado,
        motivos
      }
    });
  }

  return eventos.map((evento) => ({
    ...evento,
    validacion: evento.validacion || obtenerValidacion(data, evento.tipoEvento, evento.idEntidad)
  }));
}

function EventoReporte({ evento, index, verificarUrl }) {
  const validacion = evento.validacion || {};
  const estado = estadoTexto(validacion.estadoBlockchain);
  const verificacionId = `${evento.tipoEvento}-${evento.idEntidad}`;

  return (
    <section className="reporte-evento">
      <h3>{index + 1}. {evento.titulo}</h3>
      <div className="reporte-evento-grid">
        <div className="reporte-card">
          <div className="reporte-card-titulo">INFORMACION DEL EVENTO</div>
          <dl>
            <div><dt>Registro / Referencia:</dt><dd>{evento.referencia}</dd></div>
            {evento.filas.map(([label, value]) => (
              <div key={label}><dt>{label}:</dt><dd>{value || '-'}</dd></div>
            ))}
          </dl>
        </div>

        <div className="reporte-card">
          <div className="reporte-card-titulo">VALIDACION BLOCKCHAIN</div>
          <dl>
            <div><dt>Hash actual:</dt><dd>{hashCorto(validacion.hashActual)}</dd></div>
            <div><dt>Hash en blockchain:</dt><dd>{hashCorto(validacion.hashBlockchain)}</dd></div>
            <div><dt>Estado:</dt><dd><span className={`reporte-estado ${estado.toLowerCase().replaceAll(' ', '_')}`}>{estado}</span></dd></div>
            <div><dt>Mensaje:</dt><dd>{validacion.mensaje || 'Pendiente de validacion blockchain'}</dd></div>
            {validacion.decision && <div><dt>Decision chaincode:</dt><dd>{validacion.decision}</dd></div>}
            {validacion.motivos?.length ? <div><dt>Motivos:</dt><dd>{validacion.motivos.join('; ')}</dd></div> : null}
            {validacion.transactionId && <div><dt>Transaccion Fabric:</dt><dd>{hashCorto(validacion.transactionId)}</dd></div>}
          </dl>
        </div>

        <aside className="reporte-qr-card">
          <strong>QR DE VERIFICACION</strong>
          <CodigoQrTrazabilidad url={verificarUrl} descripcion={`QR de verificacion ${verificacionId}`} />
          <span>ID Verificacion:</span>
          <b>{verificacionId}</b>
          <small>Verificar en: {verificarUrl}</small>
        </aside>
      </div>
    </section>
  );
}

export default function ReporteTrazabilidadPage() {
  const params = useParams();
  const lote = decodeURIComponent(String(params.lote || ''));
  const usuario = obtenerUsuario();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    trazabilidadServicio.consultarPorLote(lote)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [lote]);

  const eventos = useMemo(() => (data ? crearEventosReporte(data) : []), [data]);
  const generadoEn = useMemo(() => new Date(), []);
  const reporteId = `REP-${generadoEn.getFullYear()}-${String(generadoEn.getMonth() + 1).padStart(2, '0')}-${String(generadoEn.getDate()).padStart(2, '0')}-${String(lote || 'LOTE').replace(/[^A-Za-z0-9]/g, '')}`;
  const origen = typeof window !== 'undefined' ? window.location.origin : '';
  const verificarUrl = `${origen}/verificar/${encodeURIComponent(data?.lote || lote)}`;

  if (error) {
    return (
      <GuardiaSesion>
        <GuardiaRol permitido={[ROLES.GERENTE]}>
          <div className="reporte-error">
            <h1>No fue posible generar el reporte</h1>
            <p>{error}</p>
          </div>
        </GuardiaRol>
      </GuardiaSesion>
    );
  }

  if (!data) {
    return (
      <GuardiaSesion>
        <GuardiaRol permitido={[ROLES.GERENTE]}>
          <div className="reporte-error">
            <h1>Generando reporte...</h1>
          </div>
        </GuardiaRol>
      </GuardiaSesion>
    );
  }

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <div className="reporte-acciones no-print">
          <button className="boton" onClick={() => window.print()}>Imprimir / guardar PDF</button>
        </div>

      <main className="reporte-pagina">
        <header className="reporte-header">
          <div className="reporte-marca">
            <img src="/trazaap-logo.jpeg" alt="Trazaap" />
            <div>
              <h1>Trazaap</h1>
              <p>Trazabilidad alimentaria<br />con integridad blockchain</p>
            </div>
          </div>
          <div className="reporte-titulo">
            <h2>REPORTE DE TRAZABILIDAD<br />CON VALIDACION BLOCKCHAIN</h2>
            <strong>LOTE FINAL: <span>{data.lote}</span></strong>
          </div>
          <div className="reporte-meta">
            <p><b>Reporte No:</b><br />{reporteId}</p>
            <p><b>Fecha de generacion:</b><br />{fechaCorta(generadoEn)}</p>
            <p><b>Generado por:</b><br />{usuario?.email || 'usuario@trazaap.local'}</p>
            <p><b>Despachos registrados:</b><br />{data.despachos?.length || 0}</p>
            <p><b>Codigo auditoria:</b><br />{data.codigosAcceso?.auditoria || '-'}</p>
          </div>
        </header>

        <section className="reporte-intro">
          <h2>DETALLE DE EVENTOS Y VALIDACION BLOCKCHAIN</h2>
          <p>
            A continuacion se presenta el detalle de cada evento critico del lote {data.lote}
            {' '}con su validacion en Hyperledger Fabric.
          </p>
          <div className="reporte-leyenda">
            <span><b>VERIFICADO:</b> el hash actual coincide con Fabric.</span>
            <span><b>ALTERADO:</b> el registro operativo cambio frente a la evidencia.</span>
            <span><b>NO ENCONTRADO:</b> no existe evidencia para ese evento.</span>
            <span><b>PENDIENTE:</b> Fabric no pudo validar o esta pendiente de sincronizacion.</span>
          </div>
        </section>

        {eventos.map((evento, index) => (
          <EventoReporte key={`${evento.tipoEvento}-${evento.idEntidad}`} evento={evento} index={index} verificarUrl={verificarUrl} />
        ))}

        <footer className="reporte-footer">
          <div>
            <h4>VERIFICACION DEL REPORTE</h4>
            <div className="reporte-footer-qr">
              <CodigoQrTrazabilidad url={verificarUrl} descripcion="QR publico de trazabilidad" />
              <p>
                Escanee el codigo QR o visite el enlace para verificar la autenticidad del reporte:<br />
                <b>{verificarUrl}</b><br />
                ID de verificacion: <b>{reporteId}</b><br />
                Despachos parciales: <b>{data.despachos?.length || 0}</b><br />
                Codigo auditoria: <b>{data.codigosAcceso?.auditoria || '-'}</b>
              </p>
            </div>
          </div>
          <div>
            <h4>TECNOLOGIA</h4>
            <p><b>HYPERLEDGER FABRIC</b></p>
            <p>Red: trazaap-network<br />Canal: trazabilidad-channel<br />Organizacion: TrazaapOrg</p>
          </div>
          <div>
            <h4>INTEGRIDAD</h4>
            <div className="sello-integridad">VALIDADO<br />EN BLOCKCHAIN</div>
          </div>
        </footer>
        </main>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
