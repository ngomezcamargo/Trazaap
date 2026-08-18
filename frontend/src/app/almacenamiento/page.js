'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { almacenamientoServicio, supervisionFabricServicio } from '@/servicios/almacenamiento.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { esGerente, normalizarRol, puedeAdministrar, puedeOperar, ROLES } from '@/utilidades/roles';

const ingresoVacio = () => ({ id_ubicacion: '', temperatura_ingreso_c: '', observaciones: '' });
const controlVacio = () => ({ temperatura_c: '', condicion_general: 'conforme', observaciones: '' });
const salidaVacia = () => ({ temperatura_salida_c: '', estado_producto_salida: 'conforme', decision_salida: 'liberar', observaciones: '' });
const resolucionVacia = () => ({ decision: 'liberar', motivo: '', observaciones: '' });
const ubicacionVacia = () => ({ nombre: '', descripcion: '', tipo: 'ambiente', activo: true });

function fecha(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

function Modal({ titulo, guardando, error, onCancelar, children }) {
  return (
    <div className="modal-fondo" onClick={onCancelar}>
      <div className="modal modal-almacenamiento" onClick={(event) => event.stopPropagation()}>
        <div className="modal-encabezado-form">
          <button className="boton secundario modal-cancelar" type="button" onClick={onCancelar} disabled={guardando}>Cancelar</button>
          <h3>{titulo}</h3>
        </div>
        {error && <div className="alerta error" role="alert">{error}</div>}
        {children}
      </div>
    </div>
  );
}

function ReferenciaLote({ item }) {
  return (
    <div className="almacenamiento-referencia">
      <div><span>Orden</span><strong>{item.codigo_orden}</strong></div>
      <div><span>Producto</span><strong>{item.producto} ({item.tamano_presentacion})</strong></div>
      <div><span>Lote</span><strong>{item.lote_producido}</strong></div>
      <div><span>Unidades</span><strong>{item.unidades_producidas}</strong></div>
    </div>
  );
}

export default function AlmacenamientoPage() {
  const usuario = obtenerUsuario();
  const rol = normalizarRol(usuario?.role);
  const puedeRegistrar = puedeOperar(rol);
  const puedeResolver = esGerente(rol);
  const esAdmin = puedeAdministrar(rol);
  const [pendientes, setPendientes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [resumenOutbox, setResumenOutbox] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [errorModal, setErrorModal] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const consultas = [
        almacenamientoServicio.listarPendientes(),
        almacenamientoServicio.listar(),
        almacenamientoServicio.listarUbicaciones(esAdmin)
      ];
      if (puedeResolver) consultas.push(supervisionFabricServicio.listar(), supervisionFabricServicio.resumen());
      const [pendientesRes, registrosRes, ubicacionesRes, outboxRes = [], resumenRes = {}] = await Promise.all(consultas);
      setPendientes(pendientesRes);
      setRegistros(registrosRes);
      setUbicaciones(ubicacionesRes);
      setOutbox(outboxRes);
      setResumenOutbox(resumenRes);
    } catch (err) {
      setError(err.message);
    }
  }, [esAdmin, puedeResolver]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (tipo, item = null) => {
    setErrorModal('');
    setMensaje('');
    setModal({ tipo, item });
    if (tipo === 'ingreso') setForm(ingresoVacio());
    if (tipo === 'control') setForm(controlVacio());
    if (tipo === 'salida') setForm(salidaVacia());
    if (tipo === 'resolucion') setForm(resolucionVacia());
    if (tipo === 'ubicacion') setForm(item ? { ...item } : ubicacionVacia());
  };

  const cancelar = () => {
    if (guardando) return;
    setModal(null);
    setForm({});
    setErrorModal('');
  };

  const guardar = async (event) => {
    event.preventDefault();
    setErrorModal('');
    setGuardando(true);
    try {
      if (modal.tipo === 'ingreso') {
        await almacenamientoServicio.crearIngreso({ ...form, id_manufactura: modal.item.id_manufactura });
      } else if (modal.tipo === 'control') {
        await almacenamientoServicio.crearControl(modal.item.id_almacenamiento, form);
      } else if (modal.tipo === 'salida') {
        await almacenamientoServicio.registrarSalida(modal.item.id_almacenamiento, form);
      } else if (modal.tipo === 'resolucion') {
        await almacenamientoServicio.resolverRetencion(modal.item.id_almacenamiento, form);
      } else if (modal.tipo === 'ubicacion') {
        if (modal.item?.id_ubicacion) await almacenamientoServicio.actualizarUbicacion(modal.item.id_ubicacion, form);
        else await almacenamientoServicio.crearUbicacion(form);
      }
      const tipoGuardado = modal.tipo;
      setModal(null);
      setForm({});
      setMensaje(`${tipoGuardado === 'control' ? 'Control' : tipoGuardado === 'ubicacion' ? 'Ubicacion' : 'Registro'} guardado correctamente.`);
      await cargar();
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const activos = useMemo(() => registros.filter((item) => !['despachado', 'rechazado'].includes(item.estado)), [registros]);
  const historicos = useMemo(() => registros.filter((item) => ['despachado', 'rechazado'].includes(item.estado)), [registros]);

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE, ROLES.OPERARIO]}>
        <ContenedorApp titulo="Almacenamiento" subtitulo="Control de conservacion de lotes fabricados antes de su liberacion.">
          {error && <div className="alerta error">{error}</div>}
          {mensaje && <div className="alerta ok">{mensaje}</div>}

          <div className="almacenamiento-resumen">
            <div><span>Pendientes de ingreso</span><strong>{pendientes.length}</strong></div>
            <div><span>En almacenamiento</span><strong>{activos.filter((item) => item.estado === 'almacenado').length}</strong></div>
            <div><span>Retenidos</span><strong>{activos.filter((item) => item.estado === 'retenido').length}</strong></div>
            <div><span>Listos para liberacion</span><strong>{activos.filter((item) => item.estado === 'listo_para_liberacion').length}</strong></div>
          </div>

          {puedeRegistrar && (
            <section className="tarjeta">
              <div className="seccion-encabezado"><div><h3>Pendientes de ingreso</h3><p>Lotes con manufactura registrada que aun no han ingresado a almacenamiento.</p></div></div>
              <div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Orden</th><th>Producto</th><th>Lote</th><th>Unidades</th><th>Manufactura</th><th>Condicion esperada</th><th>Accion</th></tr></thead><tbody>
                {pendientes.map((item) => <tr key={item.id_manufactura}><td>{item.codigo_orden}</td><td>{item.producto}<small className="tabla-subtexto">{item.tamano_presentacion}</small></td><td><strong>{item.lote_producido}</strong></td><td>{item.unidades_producidas}</td><td>{fecha(item.fecha_manufactura)}<small className="tabla-subtexto">{item.responsable_manufactura}</small></td><td>{item.temperatura_almacenamiento_min_c} a {item.temperatura_almacenamiento_max_c} C<small className="tabla-subtexto">{item.requiere_refrigeracion ? 'Refrigerado' : 'Ambiente'}</small></td><td><button className="boton" type="button" onClick={() => abrir('ingreso', item)}>Registrar ingreso</button></td></tr>)}
                {!pendientes.length && <tr><td colSpan="7">No hay lotes pendientes de ingreso.</td></tr>}
              </tbody></table></div>
            </section>
          )}

          <section className="tarjeta" style={{ marginTop: 16 }}>
            <h3>Lotes en seguimiento</h3>
            <div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Lote</th><th>Producto</th><th>Ubicacion</th><th>Ingreso</th><th>Rango</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
              {activos.map((item) => <tr key={item.id_almacenamiento}><td><strong>{item.lote_producido}</strong><small className="tabla-subtexto">{item.codigo_orden}</small></td><td>{item.producto}<small className="tabla-subtexto">{item.tamano_presentacion}</small></td><td>{item.ubicacion}</td><td>{fecha(item.fecha_ingreso)}</td><td>{item.temperatura_min_esperada_c} a {item.temperatura_max_esperada_c} C</td><td><span className={`estado ${item.estado}`}>{item.estado.replaceAll('_', ' ')}</span></td><td><div className="acciones acciones-compactas">{puedeRegistrar && !item.fecha_salida && !['rechazado', 'listo_para_liberacion'].includes(item.estado) && <button className="boton secundario" type="button" onClick={() => abrir('control', item)}>Control</button>}{puedeRegistrar && item.estado === 'almacenado' && !item.fecha_salida && <button className="boton secundario" type="button" onClick={() => abrir('salida', item)}>Salida</button>}{puedeResolver && item.estado === 'retenido' && <button className="boton" type="button" onClick={() => abrir('resolucion', item)}>Resolver</button>}</div></td></tr>)}
              {!activos.length && <tr><td colSpan="7">No hay lotes activos en almacenamiento.</td></tr>}
            </tbody></table></div>
          </section>

          <section className="tarjeta" style={{ marginTop: 16 }}>
            <h3>Historial de almacenamiento</h3>
            <div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Lote</th><th>Producto</th><th>Ingreso</th><th>Salida</th><th>Decision</th><th>Estado final</th></tr></thead><tbody>
              {historicos.map((item) => <tr key={item.id_almacenamiento}><td><strong>{item.lote_producido}</strong></td><td>{item.producto}</td><td>{fecha(item.fecha_ingreso)}</td><td>{fecha(item.fecha_salida)}</td><td>{item.decision_salida || item.resolucion_decision || '-'}</td><td><span className={`estado ${item.estado}`}>{item.estado}</span></td></tr>)}
              {!historicos.length && <tr><td colSpan="6">Todavia no hay registros finalizados.</td></tr>}
            </tbody></table></div>
          </section>

          {esAdmin && <section className="tarjeta" style={{ marginTop: 16 }}><div className="seccion-encabezado"><div><h3>Ubicaciones</h3><p>Espacios habilitados para conservar producto terminado.</p></div><button className="boton" type="button" onClick={() => abrir('ubicacion')}>Agregar ubicacion</button></div><div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Nombre</th><th>Tipo</th><th>Descripcion</th><th>Estado</th><th>Accion</th></tr></thead><tbody>{ubicaciones.map((item) => <tr key={item.id_ubicacion}><td>{item.nombre}</td><td>{item.tipo}</td><td>{item.descripcion || '-'}</td><td>{item.activo ? 'Activa' : 'Inactiva'}</td><td><button className="boton secundario" type="button" onClick={() => abrir('ubicacion', item)}>Editar</button></td></tr>)}</tbody></table></div></section>}

          {puedeResolver && <section className="tarjeta" style={{ marginTop: 16 }}><div className="seccion-encabezado"><div><h3>Sincronizacion con Fabric</h3><p>Seguimiento automatico de evidencias pendientes, sin duplicar el ledger en PostgreSQL.</p></div><span className="estado pendiente">Pendientes: {resumenOutbox.pendiente || 0} / Fallidos: {resumenOutbox.fallido || 0}</span></div><div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Evento</th><th>Entidad</th><th>Estado</th><th>Intentos</th><th>Ultimo error</th><th>Accion</th></tr></thead><tbody>{outbox.filter((item) => ['pendiente', 'fallido'].includes(item.estado)).map((item) => <tr key={item.id_outbox}><td>{item.tipo_evento}</td><td>{item.id_entidad}</td><td><span className={`estado ${item.estado}`}>{item.estado}</span></td><td>{item.intentos}</td><td>{item.ultimo_error || '-'}</td><td>{item.estado === 'fallido' && <button className="boton secundario" type="button" onClick={async () => { await supervisionFabricServicio.reintentar(item.id_outbox); await cargar(); }}>Reintentar</button>}</td></tr>)}{!outbox.some((item) => ['pendiente', 'fallido'].includes(item.estado)) && <tr><td colSpan="6">No hay evidencias pendientes ni fallidas.</td></tr>}</tbody></table></div></section>}

          {modal?.tipo === 'ingreso' && <Modal titulo="Registrar ingreso a almacenamiento" guardando={guardando} error={errorModal} onCancelar={cancelar}><ReferenciaLote item={modal.item} /><p className="texto-secundario">Condicion: {modal.item.condiciones_almacenamiento || 'Segun ficha tecnica'}. Rango {modal.item.temperatura_almacenamiento_min_c} a {modal.item.temperatura_almacenamiento_max_c} C.</p><form onSubmit={guardar}><div className="grid grid-2"><div className="campo"><label>Ubicacion</label><select value={form.id_ubicacion} onChange={(e) => setForm({ ...form, id_ubicacion: e.target.value })} required><option value="">Selecciona</option>{ubicaciones.filter((item) => item.activo).map((item) => <option key={item.id_ubicacion} value={item.id_ubicacion}>{item.nombre} ({item.tipo})</option>)}</select></div><div className="campo"><label>Temperatura de ingreso (C)</label><input type="number" step="0.1" value={form.temperatura_ingreso_c} onChange={(e) => setForm({ ...form, temperatura_ingreso_c: e.target.value })} required /></div></div><div className="campo"><label>Observaciones</label><textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div><div className="acciones"><button className="boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar ingreso'}</button></div></form></Modal>}
          {modal?.tipo === 'control' && <Modal titulo="Registrar control de almacenamiento" guardando={guardando} error={errorModal} onCancelar={cancelar}><ReferenciaLote item={modal.item} /><p className="texto-secundario">Rango esperado: {modal.item.temperatura_min_esperada_c} a {modal.item.temperatura_max_esperada_c} C.</p><form onSubmit={guardar}><div className="grid grid-2"><div className="campo"><label>Temperatura (C)</label><input type="number" step="0.1" value={form.temperatura_c} onChange={(e) => setForm({ ...form, temperatura_c: e.target.value })} required /></div><div className="campo"><label>Condicion general</label><select value={form.condicion_general} onChange={(e) => setForm({ ...form, condicion_general: e.target.value })}><option value="conforme">Cumple</option><option value="no_conforme">No cumple</option></select></div></div><div className="campo"><label>Observaciones</label><textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div><div className="acciones"><button className="boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar control'}</button></div></form></Modal>}
          {modal?.tipo === 'salida' && <Modal titulo="Registrar salida de almacenamiento" guardando={guardando} error={errorModal} onCancelar={cancelar}><ReferenciaLote item={modal.item} /><form onSubmit={guardar}><div className="grid grid-3"><div className="campo"><label>Temperatura de salida (C)</label><input type="number" step="0.1" value={form.temperatura_salida_c} onChange={(e) => setForm({ ...form, temperatura_salida_c: e.target.value })} required /></div><div className="campo"><label>Estado del producto</label><select value={form.estado_producto_salida} onChange={(e) => setForm({ ...form, estado_producto_salida: e.target.value })}><option value="conforme">Conforme</option><option value="no_conforme">No conforme</option></select></div><div className="campo"><label>Decision</label><select value={form.decision_salida} onChange={(e) => setForm({ ...form, decision_salida: e.target.value })}><option value="liberar">Listo para liberacion</option><option value="retener">Retener</option><option value="rechazar">Rechazar</option></select></div></div><div className="campo"><label>Observaciones</label><textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div><div className="acciones"><button className="boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar salida'}</button></div></form></Modal>}
          {modal?.tipo === 'resolucion' && <Modal titulo="Resolver retencion" guardando={guardando} error={errorModal} onCancelar={cancelar}><ReferenciaLote item={modal.item} /><form onSubmit={guardar}><div className="campo"><label>Decision</label><select value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })}><option value="liberar">Liberar despues de verificacion</option><option value="mantener_retenido">Mantener retenido</option><option value="rechazar">Rechazar lote</option></select></div><div className="campo"><label>Motivo</label><textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required minLength="5" /></div><div className="campo"><label>Observaciones adicionales</label><textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div><div className="acciones"><button className="boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar decision'}</button></div></form></Modal>}
          {modal?.tipo === 'ubicacion' && <Modal titulo={modal.item ? 'Editar ubicacion' : 'Agregar ubicacion'} guardando={guardando} error={errorModal} onCancelar={cancelar}><form onSubmit={guardar}><div className="grid grid-2"><div className="campo"><label>Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required minLength="2" /></div><div className="campo"><label>Tipo</label><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="ambiente">Ambiente</option><option value="refrigerado">Refrigerado</option><option value="congelado">Congelado</option></select></div></div><div className="campo"><label>Descripcion</label><textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div><div className="campo"><label><input type="checkbox" checked={Boolean(form.activo)} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Ubicacion activa</label></div><div className="acciones"><button className="boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar ubicacion'}</button></div></form></Modal>}
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}

