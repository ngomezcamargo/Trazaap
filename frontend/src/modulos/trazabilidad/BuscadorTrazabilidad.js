'use client';

import { useState } from 'react';
import { trazabilidadServicio } from '@/servicios/trazabilidad.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { esGerente } from '@/utilidades/roles';

const etiquetasBlockchain = {
  VERIFICADO: 'Verificado en blockchain',
  VERIFICADO_CORREGIDO: 'Verificado con correccion inmutable',
  ALTERADO: 'Registro alterado',
  PENDIENTE: 'Pendiente de validacion',
  NO_ENCONTRADO: 'No encontrado en blockchain'
};

function claseEstado(estado) {
  return estado === 'VERIFICADO_CORREGIDO' ? 'verificado' : String(estado || '').toLowerCase();
}

function textoCortoHash(hash) {
  if (!hash) return '-';
  return hash.length > 18 ? `${hash.slice(0, 12)}...${hash.slice(-6)}` : hash;
}

export function BuscadorTrazabilidad() {
  const usuario = obtenerUsuario();
  const puedeVerDetalleTecnico = esGerente(usuario?.role);
  const [lote, setLote] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await trazabilidadServicio.consultarPorLote(lote);
      setData(response);
    } catch (err) {
      setData(null);
      setError(err.message);
    }
  };

  const eventosFiltrados = (data?.eventos || []).filter((event) => {
    const filtro = filtroEvento.trim().toLowerCase();
    if (!filtro) return true;
    return [event.event_type, event.actor].join(' ').toLowerCase().includes(filtro);
  });

  const abrirReporte = () => {
    const loteReporte = data?.produccion?.manufactura?.lote_producido || data?.lote || lote;
    if (!loteReporte) return;
    window.open(`/reportes/trazabilidad/${encodeURIComponent(loteReporte)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="tarjeta">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-2">
          <div className="campo">
            <label>Lote producido</label>
            <input value={lote} onChange={(event) => setLote(event.target.value)} required />
          </div>
        </div>

        <div className="acciones">
          <button className="boton" type="submit">
            Buscar trazabilidad
          </button>
        </div>
      </form>

      {error && <div className="alerta error">{error}</div>}

      {data && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Lote producido: {data.produccion?.manufactura?.lote_producido || data.lote}</h3>
          <div className="acciones" style={{ marginTop: 0, marginBottom: 12 }}>
            <button className="boton" type="button" onClick={abrirReporte}>
              Generar reporte PDF
            </button>
          </div>
          {data.tipoConsulta === 'lote_materia_prima' ? (
            <p className="texto-secundario">No se encontro un lote producido con ese codigo; se muestra trazabilidad del lote de materia prima consultado.</p>
          ) : null}

          <div className="grid grid-2">
            <div className="tarjeta">
              <h4>Produccion</h4>
              <p><strong>Orden:</strong> {data.produccion?.orden?.codigo_orden || 'sin registro'}</p>
              <p><strong>Lote producido:</strong> {data.produccion?.manufactura?.lote_producido || 'pendiente'}</p>
              <p><strong>Producto:</strong> {(data.produccion?.productos || []).map((item) => item.producto).filter(Boolean).join(', ') || '-'}</p>
            </div>
            <div className="tarjeta">
              <h4>Liberacion y origen</h4>
              <p><strong>Liberacion:</strong> {data.liberacion ? `${data.liberacion.estado_liberacion} / peso neto ${data.liberacion.peso_neto}` : 'sin registro'}</p>
              <p><strong>Materias primas:</strong> {(data.recepciones || []).length}</p>
              <p><strong>Proveedor principal:</strong> {data.proveedor ? `${data.proveedor.nombre} (${data.proveedor.nit})` : 'sin registro directo'}</p>
            </div>
            <div className="tarjeta">
              <h4>Almacenamiento</h4>
              <p><strong>Estado:</strong> {data.almacenamiento?.estado || 'sin registro'}</p>
              <p><strong>Ubicacion:</strong> {data.almacenamiento?.ubicacion || '-'}</p>
              <p><strong>Rango esperado:</strong> {data.almacenamiento ? `${data.almacenamiento.temperatura_min_esperada_c} a ${data.almacenamiento.temperatura_max_esperada_c} C` : '-'}</p>
              <p><strong>Controles:</strong> {data.almacenamiento?.controles?.length || 0}</p>
            </div>
            <div className="tarjeta">
              <h4>Inventario terminado</h4>
              <p><strong>Liberadas:</strong> {data.inventarioProductoTerminado?.unidades_liberadas ?? '-'}</p>
              <p><strong>Despachadas:</strong> {data.inventarioProductoTerminado?.unidades_despachadas ?? '-'}</p>
              <p><strong>Disponibles:</strong> {data.inventarioProductoTerminado?.unidades_disponibles ?? '-'}</p>
              <p><strong>Estado:</strong> {data.inventarioProductoTerminado?.estado || 'sin registro'}</p>
            </div>
          </div>

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Linea de tiempo del lote</h4>
            <div className="flujo" style={{ fontSize: '0.95rem' }}>
              Recepcion de materias primas <span>{'->'}</span> Inspeccion <span>{'->'}</span> Produccion <span>{'->'}</span> Almacenamiento <span>{'->'}</span> Liberacion <span>{'->'}</span> Despacho(s) <span>{'->'}</span> Confirmacion por cliente
            </div>
          </div>

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Despachos parciales del lote</h4>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Despacho</th><th>Cliente</th><th>Factura</th><th>Cantidad del lote</th><th>Fecha</th><th>Transporte</th><th>Estado</th><th>Confirmacion</th><th>Blockchain</th></tr></thead>
                <tbody>
                  {(data.despachos || []).map((despacho) => {
                    const detallesLote = (despacho.detalles || []).filter((detalle) => String(detalle.lote) === String(data.lote));
                    const cantidad = detallesLote.reduce((total, detalle) => total + Number(detalle.cantidad_despachada || 0), 0);
                    return (
                      <tr key={despacho.id_despacho}>
                        <td>{despacho.codigo_despacho}</td>
                        <td>{despacho.cliente || 'No disponible'}</td>
                        <td>{despacho.numero_factura}</td>
                        <td>{cantidad}</td>
                        <td>{despacho.fecha_despacho ? new Date(despacho.fecha_despacho).toLocaleString() : '-'}</td>
                        <td>{despacho.conductor || '-'} / {despacho.placa_vehiculo || '-'}</td>
                        <td><span className={`estado ${despacho.estado_despacho}`}>{despacho.estado_despacho}</span></td>
                        <td>{despacho.estado_confirmacion || 'Pendiente'}</td>
                        <td><span className={`estado ${despacho.blockchain ? 'verificado' : 'pendiente'}`}>{despacho.blockchain ? 'Verificado' : 'Pendiente'}</span></td>
                      </tr>
                    );
                  })}
                  {!(data.despachos || []).length && <tr><td colSpan={9}>El lote aun no tiene despachos.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Materias primas de origen</h4>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Materia prima</th>
                  <th>Proveedor</th>
                  <th>Cantidad recibida</th>
                  <th>Inspeccion</th>
                </tr>
              </thead>
              <tbody>
                {(data.recepciones || []).map((recepcion) => {
                  const inspeccion = (data.inspecciones || []).find((item) => item.recepcion_id === recepcion.id);
                  return (
                    <tr key={recepcion.id}>
                      <td>{recepcion.numero_lote || recepcion.lote_proveedor}</td>
                      <td>{recepcion.materia_prima || '-'}</td>
                      <td>{recepcion.proveedor ? `${recepcion.proveedor.nombre} (${recepcion.proveedor.nit})` : '-'}</td>
                      <td>{recepcion.cantidad} {recepcion.unidad_medida || recepcion.unidad_presentacion || ''}</td>
                      <td>
                        <span className={`estado ${inspeccion?.decision_final || 'retenido'}`}>
                          {inspeccion?.decision_final || 'pendiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(data.recepciones || []).length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay materias primas asociadas a este lote producido.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Decisiones del chaincode</h4>
            <table className="tabla">
              <thead><tr><th>Evento</th><th>Estado</th><th>Fecha Fabric</th><th>Decision / motivos</th><th>Transaccion</th></tr></thead>
              <tbody>
                {(data.decisionesBlockchain || [])
                  .filter((item) => item.tipoEvento !== 'correccion_evento')
                  .map((item) => (
                    <tr key={item.txId || `${item.tipoEvento}-${item.idEntidad}`}>
                      <td>{item.tipoEvento}</td>
                      <td><span className={`estado ${String(item.estado || '').toLowerCase()}`}>{item.estado || '-'}</span></td>
                      <td>{item.timestampBlockchain ? new Date(item.timestampBlockchain).toLocaleString() : '-'}</td>
                      <td>{item.decisionChaincode?.motivos?.length ? item.decisionChaincode.motivos.join('; ') : (item.decisionChaincode?.estado || item.estado || '-')}</td>
                      <td title={item.txId || ''}>{textoCortoHash(item.txId)}</td>
                    </tr>
                  ))}
                {!(data.decisionesBlockchain || []).filter((item) => item.tipoEvento !== 'correccion_evento').length && (
                  <tr><td colSpan={5}>No hay decisiones automaticas adicionales para este lote.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {puedeVerDetalleTecnico && (
            <div className="tarjeta" style={{ marginTop: 12 }}>
              <h4>Historial tecnico de correcciones</h4>
              <table className="tabla">
                <thead><tr><th>Evento original</th><th>Motivo</th><th>Actor</th><th>Fecha Fabric</th><th>Transaccion</th></tr></thead>
                <tbody>
                  {(data.historialCorrecciones || []).map((item) => (
                    <tr key={item.txId}>
                      <td>{item.tipoEventoOriginal}:{item.idEntidadOriginal}</td>
                      <td>{item.motivoCorreccion}</td>
                      <td>{item.actor}</td>
                      <td>{item.timestampBlockchain ? new Date(item.timestampBlockchain).toLocaleString() : '-'}</td>
                      <td title={item.txId}>{textoCortoHash(item.txId)}</td>
                    </tr>
                  ))}
                  {!(data.historialCorrecciones || []).length && (
                    <tr><td colSpan={5}>Este lote no tiene correcciones registradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Validacion blockchain</h4>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Entidad</th>
                  <th>Estado</th>
                  <th>Hash actual</th>
                  <th>Hash Fabric</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {(data.validacionesBlockchain || []).map((item) => (
                  <tr key={`${item.tipoEvento}-${item.idEntidad}`}>
                    <td>{item.tipoEvento}</td>
                    <td>{item.idEntidad}</td>
                    <td>
                      <span className={`estado ${claseEstado(item.estadoBlockchain)}`}>
                        {etiquetasBlockchain[item.estadoBlockchain] || item.estadoBlockchain || 'Pendiente de validacion'}
                      </span>
                    </td>
                    <td title={item.hashActual}>{textoCortoHash(item.hashActual)}</td>
                    <td title={item.hashBlockchain || ''}>{textoCortoHash(item.hashBlockchain)}</td>
                    <td>{item.mensaje || '-'}</td>
                  </tr>
                ))}
                {(data.validacionesBlockchain || []).length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay eventos criticos para validar en blockchain.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <h4>Eventos</h4>
          <div className="campo" style={{ marginBottom: 10 }}>
            <label>Filtrar eventos por tipo o actor</label>
            <input value={filtroEvento} onChange={(event) => setFiltroEvento(event.target.value)} />
          </div>
          <table className="tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Actor</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.map((event) => (
                <tr key={event.id}>
                  <td>{event.event_type}</td>
                  <td>{event.actor}</td>
                  <td>{new Date(event.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {eventosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={3}>No hay eventos que coincidan con el filtro.</td>
                </tr>
              ) : null}
            </tbody>
          </table>

        </div>
      )}
    </div>
  );
}
