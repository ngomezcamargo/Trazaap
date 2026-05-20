'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicoServicio } from '@/servicios/publico.servicio';

function fecha(fechaValor) {
  if (!fechaValor) return '-';
  return new Date(fechaValor).toLocaleDateString();
}

function estadoClase(estado) {
  return String(estado || 'PENDIENTE').toLowerCase();
}

function fechaCompleta(fechaValor) {
  if (!fechaValor) return '-';
  return new Date(fechaValor).toLocaleString();
}

function etiquetaBlockchain(estado) {
  if (estado === 'VERIFICADO') return 'Verificado en blockchain';
  if (estado === 'ALTERADO') return 'Registro alterado';
  if (estado === 'NO_ENCONTRADO') return 'Sin evidencia blockchain';
  return 'Pendiente de validacion';
}

export default function VerificacionLotePage() {
  const params = useParams();
  const lote = decodeURIComponent(String(params.lote || ''));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    publicoServicio.consultarTrazabilidadPorLote(lote)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [lote]);

  if (error) {
    return (
      <main className="portal-qr">
        <section className="portal-qr-card">
          <img src="/trazaap-logo.jpeg" alt="Trazaap" />
          <h1>No fue posible verificar el lote</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="portal-qr">
        <section className="portal-qr-card">
          <img src="/trazaap-logo.jpeg" alt="Trazaap" />
          <h1>Verificando lote...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="portal-qr">
      <section className="portal-qr-card">
        <header className="portal-qr-header">
          <img src="/trazaap-logo.jpeg" alt="Trazaap" />
          <div>
            <span>Trazaap</span>
            <h1>Verificacion publica de trazabilidad</h1>
          </div>
        </header>

        <div className="portal-qr-lote">
          <span>Lote final</span>
          <strong>{data.lote}</strong>
        </div>

        <div className={`portal-estado ${estadoClase(data.blockchain?.estado)}`}>
          {data.blockchain?.estado || 'PENDIENTE'}
        </div>

        <div className="portal-qr-grid">
          <div>
            <h2>Producto</h2>
            <p><b>Nombre:</b> {data.producto?.nombre || '-'}</p>
            <p><b>Presentacion:</b> {data.producto?.tamano_presentacion || '-'}</p>
            <p><b>Fecha de vencimiento:</b> {fecha(data.liberacion?.fecha_vencimiento)}</p>
            <p><b>Estado de liberacion:</b> {data.liberacion?.estado_liberacion || '-'}</p>
          </div>

          <div>
            <h2>Validacion blockchain</h2>
            <p><b>Eventos verificados:</b> {data.blockchain?.eventos_verificados || 0} de {data.blockchain?.eventos_totales || 0}</p>
            <p><b>Fecha de manufactura:</b> {fecha(data.manufactura?.fecha_inicio)}</p>
            <p><b>Fecha de liberacion:</b> {fecha(data.liberacion?.fecha_liberacion)}</p>
          </div>
        </div>

        <section className="portal-origen">
          <h2>Origen de materias primas</h2>
          <div className="portal-origen-lista">
            {(data.origenes || []).map((origen, index) => (
              <article key={`${origen.lote}-${index}`}>
                <b>{origen.materia_prima}</b>
                <span>Lote: {origen.lote || '-'}</span>
                <span>Proveedor: {origen.proveedor || '-'}</span>
              </article>
            ))}
            {!data.origenes?.length ? <p>No hay origenes publicos asociados.</p> : null}
          </div>
        </section>

        <section className="portal-historial">
          <div className="portal-seccion-titulo">
            <h2>Historial completo del lote</h2>
            <p>Eventos criticos registrados desde la recepcion de materias primas hasta la liberacion del producto.</p>
          </div>

          <div className="portal-timeline">
            {(data.eventos || []).map((evento, index) => (
              <article className="portal-evento" key={`${evento.tipo}-${index}`}>
                <div className="portal-evento-numero">{index + 1}</div>
                <div className="portal-evento-cuerpo">
                  <header>
                    <div>
                      <h3>{evento.titulo}</h3>
                      <span>{fechaCompleta(evento.fecha)}</span>
                    </div>
                    <span className={`portal-evento-estado ${estadoClase(evento.estado)}`}>{evento.estado || '-'}</span>
                  </header>
                  <p>{evento.descripcion}</p>
                  <dl>
                    {(evento.datos || []).map((item) => (
                      <div key={item.etiqueta}>
                        <dt>{item.etiqueta}</dt>
                        <dd>{String(item.valor || '-')}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className={`portal-blockchain ${estadoClase(evento.blockchain?.estado)}`}>
                    {etiquetaBlockchain(evento.blockchain?.estado)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="portal-qr-footer">
          Portal publico QR conforme a la trazabilidad del lote. La informacion comercial sensible permanece reservada para usuarios autorizados.
        </footer>
      </section>
    </main>
  );
}
