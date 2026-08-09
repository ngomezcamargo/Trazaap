'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicoServicio } from '@/servicios/publico.servicio';

function fecha(fechaValor) {
  if (!fechaValor) return '-';
  return new Date(fechaValor).toLocaleDateString();
}

function estadoClase(estado) {
  if (estado === 'VERIFICADO_CORREGIDO') return 'verificado';
  return String(estado || 'PENDIENTE').toLowerCase();
}

function fechaCompleta(fechaValor) {
  if (!fechaValor) return '-';
  return new Date(fechaValor).toLocaleString();
}

function etiquetaBlockchain(estado) {
  if (estado === 'VERIFICADO') return 'Verificado en blockchain';
  if (estado === 'VERIFICADO_CORREGIDO') return 'Verificado con correccion inmutable';
  if (estado === 'ALTERADO') return 'Registro alterado';
  if (estado === 'NO_ENCONTRADO') return 'Sin evidencia blockchain';
  return 'Pendiente de validacion';
}

export default function VerificacionLotePage() {
  const params = useParams();
  const lote = decodeURIComponent(String(params.lote || ''));
  const [data, setData] = useState(null);
  const [tipoAcceso, setTipoAcceso] = useState('cliente');
  const [factura, setFactura] = useState('');
  const [codigo, setCodigo] = useState('');
  const [dataControlada, setDataControlada] = useState(null);
  const [cargandoControlado, setCargandoControlado] = useState(false);
  const [errorControlado, setErrorControlado] = useState('');
  const [receptor, setReceptor] = useState('');
  const [observacionesRecepcion, setObservacionesRecepcion] = useState('');
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState(false);
  const [confirmacionResultado, setConfirmacionResultado] = useState(null);
  const [errorConfirmacion, setErrorConfirmacion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    publicoServicio.consultarTrazabilidadPorLote(lote)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [lote]);

  const consultarAccesoControlado = async (event) => {
    event.preventDefault();
    setErrorControlado('');
    setDataControlada(null);
    setCargandoControlado(true);

    try {
      const respuesta = tipoAcceso === 'cliente'
        ? await publicoServicio.consultarComoCliente({ lote, factura, codigo })
        : await publicoServicio.consultarComoAuditoria({ lote, codigo });
      setDataControlada(respuesta);
      setConfirmacionResultado(respuesta.confirmacionCliente?.confirmado ? respuesta.confirmacionCliente : null);
    } catch (err) {
      setErrorControlado(err.message);
    } finally {
      setCargandoControlado(false);
    }
  };

  const confirmarRecepcion = async (event) => {
    event.preventDefault();
    setErrorConfirmacion('');
    setConfirmandoRecepcion(true);
    try {
      const resultado = await publicoServicio.confirmarRecepcion({
        lote,
        factura,
        codigo,
        receptor,
        fecha_recepcion: new Date().toISOString(),
        observaciones: observacionesRecepcion
      });
      setConfirmacionResultado(resultado);
      setDataControlada((actual) => ({ ...actual, confirmacionCliente: resultado }));
    } catch (err) {
      setErrorConfirmacion(err.message);
    } finally {
      setConfirmandoRecepcion(false);
    }
  };

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
          <h2>Origen publico de materias primas</h2>
          <div className="portal-origen-lista">
            {(data.origenes || []).map((origen, index) => (
              <article key={`${origen.lote}-${index}`}>
                <b>{origen.materia_prima}</b>
                <span>Lote: {origen.lote || '-'}</span>
                <span>Estado de recepcion: {origen.estado_recepcion || '-'}</span>
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

        <section className="portal-acceso-controlado">
          <div className="portal-seccion-titulo">
            <h2>Acceso controlado</h2>
            <p>
              Cliente receptor e INVIMA pueden consultar informacion ampliada sin ingresar al panel interno,
              usando factura o codigo de verificacion.
            </p>
          </div>

          <form className="portal-acceso-form" onSubmit={consultarAccesoControlado}>
            <div className="portal-selector">
              <button
                type="button"
                className={tipoAcceso === 'cliente' ? 'activo' : ''}
                onClick={() => {
                  setTipoAcceso('cliente');
                  setDataControlada(null);
                  setErrorControlado('');
                  setConfirmacionResultado(null);
                }}
              >
                Cliente
              </button>
              <button
                type="button"
                className={tipoAcceso === 'auditoria' ? 'activo' : ''}
                onClick={() => {
                  setTipoAcceso('auditoria');
                  setDataControlada(null);
                  setErrorControlado('');
                  setConfirmacionResultado(null);
                }}
              >
                INVIMA / auditoria
              </button>
            </div>

            {tipoAcceso === 'cliente' && (
              <label>
                Factura
                <input value={factura} onChange={(event) => setFactura(event.target.value)} placeholder="Numero de factura" />
              </label>
            )}

            <label>
              Codigo de verificacion
              <input
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                placeholder={tipoAcceso === 'cliente' ? 'Opcional si ingresa factura' : 'Codigo de auditoria'}
                required={tipoAcceso === 'auditoria'}
              />
            </label>

            <button type="submit" disabled={cargandoControlado}>
              {cargandoControlado ? 'Consultando...' : 'Consultar informacion'}
            </button>
          </form>

          {errorControlado && <div className="portal-alerta">{errorControlado}</div>}

          {dataControlada && (
            <div className="portal-controlado-detalle">
              <header>
                <div>
                  <span>Vista autorizada</span>
                  <h3>{dataControlada.alcance === 'auditoria_invima' ? 'Auditoria / INVIMA' : 'Cliente receptor'}</h3>
                </div>
                <strong>{dataControlada.codigo_verificacion || dataControlada.factura || '-'}</strong>
              </header>

              {dataControlada.despacho_liberacion && (
                <div className="portal-qr-grid">
                  <div>
                    <h2>Liberacion / entrega</h2>
                    <p><b>Factura:</b> {dataControlada.despacho_liberacion.numero_factura || '-'}</p>
                    <p><b>Unidades:</b> {dataControlada.despacho_liberacion.unidades_empacadas || '-'}</p>
                    <p><b>Empaque:</b> {dataControlada.despacho_liberacion.tipo_empaque || '-'}</p>
                    <p><b>Estado:</b> {dataControlada.despacho_liberacion.estado_liberacion || '-'}</p>
                  </div>
                  <div>
                    <h2>Transporte</h2>
                    <p><b>Conductor:</b> {dataControlada.despacho_liberacion.conductor || '-'}</p>
                    <p><b>Placa:</b> {dataControlada.despacho_liberacion.placa_vehiculo || '-'}</p>
                    <p><b>Limpieza vehiculo:</b> {dataControlada.despacho_liberacion.limpieza_vehiculo === 'cumple' ? 'Cumple' : 'No cumple / no registrado'}</p>
                    <p><b>Documentacion:</b> {dataControlada.despacho_liberacion.documentacion_dotacion === 'cumple' ? 'Cumple' : 'No cumple / no registrado'}</p>
                  </div>
                </div>
              )}

              {dataControlada.alcance === 'cliente_receptor' && (
                <section className="portal-confirmacion">
                  <h2>Confirmacion de recepcion</h2>
                  {confirmacionResultado?.confirmado ? (
                    <div className="portal-confirmacion-ok">
                      <strong>Recepcion confirmada en blockchain</strong>
                      <span>{fechaCompleta(confirmacionResultado.fechaConfirmacion)}</span>
                      {confirmacionResultado.transactionId && (
                        <small>Transaccion Fabric: {confirmacionResultado.transactionId}</small>
                      )}
                    </div>
                  ) : (
                    <form className="portal-acceso-form" onSubmit={confirmarRecepcion}>
                      <label>
                        Persona que recibe
                        <input
                          value={receptor}
                          onChange={(event) => setReceptor(event.target.value)}
                          placeholder="Nombre o identificacion del receptor"
                          required
                          minLength={2}
                        />
                      </label>
                      <label>
                        Observaciones
                        <input
                          value={observacionesRecepcion}
                          onChange={(event) => setObservacionesRecepcion(event.target.value)}
                          placeholder="Opcional"
                        />
                      </label>
                      <button type="submit" disabled={confirmandoRecepcion}>
                        {confirmandoRecepcion ? 'Confirmando...' : 'Confirmar recepcion del lote'}
                      </button>
                    </form>
                  )}
                  {errorConfirmacion && <div className="portal-alerta">{errorConfirmacion}</div>}
                </section>
              )}

              {dataControlada.alcance === 'auditoria_invima' && (
                <div className="portal-auditoria-resumen">
                  <h2>Resumen tecnico</h2>
                  <p><b>Recepciones:</b> {dataControlada.recepciones?.length || 0}</p>
                  <p><b>Inspecciones:</b> {dataControlada.inspecciones?.length || 0}</p>
                  <p><b>Eventos blockchain:</b> {dataControlada.validacionesBlockchain?.length || 0}</p>
                  <p><b>Estado general:</b> {dataControlada.blockchain?.estado || '-'}</p>
                </div>
              )}

              <div className="portal-timeline portal-timeline-controlado">
                {(dataControlada.eventos || []).map((evento, index) => (
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
                      {dataControlada.alcance === 'auditoria_invima' && (
                        <div className="portal-hashes">
                          <span>Hash actual: {evento.blockchain?.hashActual || '-'}</span>
                          <span>Hash Fabric: {evento.blockchain?.hashBlockchain || '-'}</span>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="portal-qr-footer">
          Portal publico QR conforme a la trazabilidad del lote. La informacion comercial sensible permanece reservada para usuarios autorizados.
        </footer>
      </section>
    </main>
  );
}
