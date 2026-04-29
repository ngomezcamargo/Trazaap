'use client';

import { useState } from 'react';
import { trazabilidadServicio } from '@/servicios/trazabilidad.servicio';

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

  return (
    <div className="tarjeta">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-2">
          <div className="campo">
            <label>Lote del proveedor</label>
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
          <h3 style={{ marginBottom: 8 }}>Lote: {data.lote}</h3>

          <div className="grid grid-2">
            <div className="tarjeta">
              <h4>Recepcion</h4>
              <p><strong>Proveedor:</strong> {data.proveedor ? `${data.proveedor.nombre} (${data.proveedor.nit})` : 'sin registro directo'}</p>
              <p><strong>Estado:</strong> <span className={`estado ${data.recepcion?.estado_recepcion || ''}`}>{data.recepcion?.estado_recepcion || 'sin registro'}</span></p>
              <p><strong>Materia prima:</strong> {data.recepcion?.materia_prima || '-'}</p>
            </div>
            <div className="tarjeta">
              <h4>Inspeccion y liberacion</h4>
              <p><strong>Inspeccion:</strong> <span className={`estado ${data.inspeccion?.decision_final || 'retenido'}`}>{data.inspeccion ? data.inspeccion.decision_final : 'pendiente'}</span></p>
              <p><strong>Liberacion:</strong> {data.liberacion ? `${data.liberacion.estado_liberacion} / peso neto ${data.liberacion.peso_neto}` : 'sin registro'}</p>
              <p><strong>Produccion:</strong> {data.produccion ? `${data.produccion.orden.codigo_orden} / lote ${data.produccion.lote_terminado?.lote_producto || 'pendiente'}` : 'sin registro'}</p>
            </div>
          </div>

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <h4>Linea de tiempo del lote</h4>
            <div className="flujo" style={{ fontSize: '0.95rem' }}>
              Recepcion <span>{'->'}</span> Inspeccion <span>{'->'}</span> Produccion <span>{'->'}</span> Liberacion <span>{'->'}</span> Blockchain
            </div>
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

          <h4 style={{ marginTop: 18 }}>Eventos blockchain</h4>
          <table className="tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Hash</th>
                <th>Usuario</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(data.eventosBlockchain || []).map((event) => (
                <tr key={event.id}>
                  <td>{event.tipoEvento}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{event.hash}</td>
                  <td>{event.usuario}</td>
                  <td>{new Date(event.fechaEvento).toLocaleString()}</td>
                </tr>
              ))}
              {(data.eventosBlockchain || []).length === 0 ? (
                <tr>
                  <td colSpan={4}>Sin eventos blockchain para este lote.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
