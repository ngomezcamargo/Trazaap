'use client';

import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { trazabilidadServicio } from '@/servicios/trazabilidad.servicio';
import { ROLES } from '@/utilidades/roles';
import { useState } from 'react';

const tiposEvento = [
  'RECEPCION_MATERIA_PRIMA',
  'INICIO_FABRICACION',
  'CIERRE_FABRICACION',
  'CONTROL_CALIDAD',
  'ALMACENAMIENTO',
  'DESPACHO',
  'DEVOLUCION',
  'NO_CONFORMIDAD'
];

function abreviar(value) {
  if (!value) return '-';
  const texto = String(value);
  return texto.length > 18 ? `${texto.slice(0, 10)}...${texto.slice(-6)}` : texto;
}

function formatearFecha(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CO');
}

function parseDatosEvento(value) {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Datos del evento debe ser un JSON valido');
  }
}

export default function BlockchainPage() {
  const [codigoLote, setCodigoLote] = useState('L-2026-001');
  const [form, setForm] = useState({
    tipoEvento: 'RECEPCION_MATERIA_PRIMA',
    descripcion: 'Recepcion de harina de trigo',
    responsable: 'admin@trazaap.local',
    datosEvento: '{\n  "proveedor": "Proveedor demo",\n  "cantidad": 25,\n  "unidad": "kg"\n}'
  });
  const [eventos, setEventos] = useState([]);
  const [evidenciaFabric, setEvidenciaFabric] = useState(null);
  const [verificacion, setVerificacion] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function ejecutar(accion) {
    setCargando(true);
    setError('');
    setMensaje('');
    try {
      await accion();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function cargarEventos(lote = codigoLote) {
    const data = await trazabilidadServicio.listarEventosAuditables(lote);
    setEventos(data.eventos || []);
    return data;
  }

  async function crearEvento(event) {
    event.preventDefault();
    await ejecutar(async () => {
      const payload = {
        codigoLote,
        tipoEvento: form.tipoEvento,
        descripcion: form.descripcion,
        responsable: form.responsable,
        datosEvento: parseDatosEvento(form.datosEvento)
      };
      const creado = await trazabilidadServicio.crearEvento(payload);
      setMensaje(`Evento registrado en Fabric: ${abreviar(creado.fabricTxId)}`);
      setEvidenciaFabric(null);
      setVerificacion(null);
      await cargarEventos(codigoLote);
    });
  }

  async function consultarFabric(eventId) {
    await ejecutar(async () => {
      const data = await trazabilidadServicio.consultarEvidenciaFabric(eventId);
      setEvidenciaFabric(data);
      setMensaje(`Evidencia Fabric consultada: ${abreviar(data.txId)}`);
    });
  }

  async function verificarIntegridad() {
    await ejecutar(async () => {
      const data = await trazabilidadServicio.verificarLote(codigoLote);
      setVerificacion(data);
      setMensaje(data.integridadValida ? 'Integridad del lote verificada' : 'La verificacion encontro errores');
    });
  }

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp
          titulo="Blockchain"
          subtitulo="Demo de evidencia auditable registrada en Hyperledger Fabric."
        >
          <div className="grid" style={{ gap: 18 }}>
            <section className="tarjeta">
              <h3>Evento auditable</h3>
              <form onSubmit={crearEvento}>
                <div className="grid grid-2">
                  <div className="campo">
                    <label>Codigo de lote</label>
                    <input required value={codigoLote} onChange={(event) => setCodigoLote(event.target.value)} />
                  </div>
                  <div className="campo">
                    <label>Tipo de evento</label>
                    <select value={form.tipoEvento} onChange={(event) => setForm({ ...form, tipoEvento: event.target.value })}>
                      {tiposEvento.map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="campo">
                    <label>Responsable</label>
                    <input required value={form.responsable} onChange={(event) => setForm({ ...form, responsable: event.target.value })} />
                  </div>
                  <div className="campo">
                    <label>Descripcion</label>
                    <input required value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} />
                  </div>
                </div>
                <div className="campo" style={{ marginTop: 14 }}>
                  <label>Datos del evento JSON</label>
                  <textarea value={form.datosEvento} onChange={(event) => setForm({ ...form, datosEvento: event.target.value })} />
                </div>
                <div className="acciones">
                  <button className="boton" type="submit" disabled={cargando}>Crear evento</button>
                  <button className="boton secundario" type="button" disabled={cargando || !codigoLote} onClick={() => ejecutar(() => cargarEventos())}>
                    Listar eventos
                  </button>
                  <button className="boton secundario" type="button" disabled={cargando || !codigoLote} onClick={verificarIntegridad}>
                    Verificar lote
                  </button>
                </div>
              </form>
              {mensaje ? <div className="alerta ok">{mensaje}</div> : null}
              {error ? <div className="alerta error">{error}</div> : null}
            </section>

            <section className="tarjeta">
              <h3>Eventos del lote</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tipo</th>
                      <th>Descripcion</th>
                      <th>Responsable</th>
                      <th>Fecha</th>
                      <th>Hash</th>
                      <th>Hash anterior</th>
                      <th>Fabric tx</th>
                      <th>Estado</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((evento) => (
                      <tr key={evento.id}>
                        <td title={evento.id}>{abreviar(evento.id)}</td>
                        <td>{evento.tipoEvento}</td>
                        <td>{evento.descripcion}</td>
                        <td>{evento.responsable}</td>
                        <td>{formatearFecha(evento.fechaEvento)}</td>
                        <td title={evento.hashEvento}>{abreviar(evento.hashEvento)}</td>
                        <td title={evento.hashAnterior || ''}>{abreviar(evento.hashAnterior)}</td>
                        <td title={evento.fabricTxId || ''}>{abreviar(evento.fabricTxId)}</td>
                        <td><span className={`estado ${evento.fabricStatus || ''}`}>{evento.fabricStatus || '-'}</span></td>
                        <td>
                          <button className="boton secundario" type="button" disabled={cargando} onClick={() => consultarFabric(evento.id)}>
                            Fabric
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!eventos.length ? (
                      <tr>
                        <td colSpan="10">Sin eventos cargados.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {evidenciaFabric ? (
              <section className="tarjeta">
                <h3>Evidencia en Fabric</h3>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(evidenciaFabric, null, 2)}</pre>
              </section>
            ) : null}

            {verificacion ? (
              <section className="tarjeta">
                <h3>Verificacion de integridad</h3>
                <div className="grid grid-3">
                  <div>
                    <p><strong>Lote:</strong> {verificacion.codigoLote}</p>
                  </div>
                  <div>
                    <p><strong>Integridad:</strong> <span className="estado">{verificacion.integridadValida ? 'valida' : 'con errores'}</span></p>
                  </div>
                  <div>
                    <p><strong>Eventos verificados:</strong> {verificacion.eventosVerificados}</p>
                  </div>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{JSON.stringify(verificacion.errores || [], null, 2)}</pre>
              </section>
            ) : null}
          </div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
