'use client';

import { useState } from 'react';
import { trazabilidadServicio } from '@/servicios/trazabilidad.servicio';

const etiquetasBlockchain = {
  VERIFICADO: 'Verificado en blockchain',
  ALTERADO: 'Registro alterado',
  PENDIENTE: 'Pendiente de validacion',
  NO_ENCONTRADO: 'No encontrado en blockchain'
};

function textoCortoHash(hash) {
  if (!hash) return '-';
  return hash.length > 18 ? `${hash.slice(0, 12)}...${hash.slice(-6)}` : hash;
}

export function BuscadorTrazabilidad() {
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
          </div>

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Linea de tiempo del lote</h4>
            <div className="flujo" style={{ fontSize: '0.95rem' }}>
              Recepcion de materias primas <span>{'->'}</span> Inspeccion <span>{'->'}</span> Produccion <span>{'->'}</span> Liberacion
            </div>
          </div>

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Materias primas de origen</h4>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Lote proveedor</th>
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
            <h4>Validacion blockchain</h4>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Entidad</th>
                  <th>Estado</th>
                  <th>Hash actual</th>
                  <th>Hash Fabric</th>
                </tr>
              </thead>
              <tbody>
                {(data.validacionesBlockchain || []).map((item) => (
                  <tr key={`${item.tipoEvento}-${item.idEntidad}`}>
                    <td>{item.tipoEvento}</td>
                    <td>{item.idEntidad}</td>
                    <td>
                      <span className={`estado ${item.estadoBlockchain?.toLowerCase() || ''}`}>
                        {etiquetasBlockchain[item.estadoBlockchain] || item.estadoBlockchain || 'Pendiente de validacion'}
                      </span>
                    </td>
                    <td title={item.hashActual}>{textoCortoHash(item.hashActual)}</td>
                    <td title={item.hashBlockchain || ''}>{textoCortoHash(item.hashBlockchain)}</td>
                  </tr>
                ))}
                {(data.validacionesBlockchain || []).length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay eventos criticos para validar en blockchain.</td>
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
