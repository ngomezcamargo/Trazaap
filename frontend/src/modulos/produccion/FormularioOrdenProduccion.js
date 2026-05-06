'use client';

import { useEffect, useMemo, useState } from 'react';
import { produccionServicio } from '@/servicios/produccion.servicio';
import { materiasPrimasServicio } from '@/servicios/materias-primas.servicio';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { normalizarRol, ROLES } from '@/utilidades/roles';

const TABS = {
  ORDENES: 'ordenes',
  NUEVA: 'nueva',
  ACTIVA: 'activa',
  PRODUCTOS: 'productos',
  TIEMPOS: 'tiempos'
};

function alertaRango(label, valor, min, max) {
  if (valor === '' || valor == null) return null;
  const n = Number(valor);
  if (Number.isNaN(n)) return null;
  return n < min || n > max ? `${label} fuera de rango esperado (${min}-${max})` : null;
}

const recetaVacia = () => ({ materia_prima_id: '', cantidad_requerida: '', observaciones: '' });

const varianteVacia = () => ({
  tamano_presentacion: 'mediano',
  peso_estimado_unidad: '',
  unidad_medida: 'unidad',
  estado: 'activo',
  receta: [recetaVacia()]
});

const productoVacio = () => ({
  id: null,
  nombre: '',
  categoria: '',
  descripcion: '',
  vida_util_dias: '',
  condiciones_almacenamiento: '',
  estado: 'activo',
  requiere_inmersion: false,
  tiempo_fermentacion_minutos: '',
  temperatura_fermentacion_c: '',
  tiempo_horneado_minutos: '',
  temperatura_horneado_c: '',
  tiempo_inmersion_minutos: '',
  temperatura_inmersion_c: '',
  variantes: [varianteVacia()]
});

export function FormularioOrdenProduccion() {
  const usuario = obtenerUsuario();
  const esOperario = normalizarRol(usuario?.role) === ROLES.OPERARIO;
  const tabsDisponibles = esOperario
    ? [TABS.NUEVA, TABS.ACTIVA]
    : [TABS.ORDENES, TABS.NUEVA, TABS.ACTIVA, TABS.PRODUCTOS];

  const [tab, setTab] = useState(tabsDisponibles[0]);
  const [ordenes, setOrdenes] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [ordenActivaId, setOrdenActivaId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [operarios, setOperarios] = useState([]);
  const [productosFabricados, setProductosFabricados] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [detalleProducto, setDetalleProducto] = useState(null);
  const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
  const [mostrarFormularioOrden, setMostrarFormularioOrden] = useState(false);
  const [mostrarFormularioMateria, setMostrarFormularioMateria] = useState(false);
  const [resumenInsumos, setResumenInsumos] = useState([]);
  const [formProducto, setFormProducto] = useState(productoVacio());

  const [formOrden, setFormOrden] = useState({
    fecha_produccion: new Date().toISOString().slice(0, 10),
    codigo_orden: '',
    responsable_produccion: esOperario ? String(usuario?.id || '') : '',
    estado: 'pendiente',
    observaciones: '',
    creado_por: String(usuario?.id || '')
  });
  const [productos, setProductos] = useState([
    { producto_id: '', variante_id: '', producto: '', tamano_presentacion: 'mediano', cantidad_programada: '', observaciones: '' }
  ]);
  const [materia, setMateria] = useState({ orden_producto_id: '', materia_prima_id: '', recepcion_id: '', nombre_ingrediente: '', cantidad_planificada: '', cantidad_real: '', unidad_medida: '', observaciones: '' });
  const [tiempo, setTiempo] = useState({ numero_carro_escabiladero: '', producto: '', es_bagel: false, unidades_producidas: '', temperatura_crecimiento: '', tiempo_crecimiento_min: '', temperatura_inmersion_agua: '', tiempo_inmersion_agua_seg: '', temperatura_horneo: '', tiempo_horneo_min: '', lote_producto: '', responsable_produccion: String(usuario?.id || ''), observaciones: '' });

  const recargar = async () => {
    const [ops, recs, mats, prods] = await Promise.all([
      produccionServicio.listarOrdenes(),
      produccionServicio.listarRecepcionesDisponibles(),
      materiasPrimasServicio.listar(),
      produccionServicio.listarProductos(busquedaProducto)
    ]);
    setOrdenes(ops);
    setRecepciones(recs);
    setMateriasPrimas(mats.filter((m) => m.is_active));
    setProductosFabricados(prods);
    if (!ordenActivaId && ops[0]?.id) setOrdenActivaId(String(ops[0].id));

    if (!esOperario) {
      const users = await autenticacionServicio.listarOperarios();
      setOperarios(users);
    }
  };

  useEffect(() => { recargar().catch((e) => setError(e.message)); }, []);

  useEffect(() => {
    const seleccion = materiasPrimas.find((m) => String(m.id) === String(materia.materia_prima_id));
    if (!seleccion) return;
    const unidad = seleccion.unidad_medida_base || seleccion.unidad_medida || 'unidad';
    setMateria((prev) => ({ ...prev, nombre_ingrediente: seleccion.nombre, unidad_medida: unidad }));
  }, [materia.materia_prima_id, materiasPrimas]);

  useEffect(() => {
    if (!ordenActivaId) return;
    produccionServicio.obtenerOrden(Number(ordenActivaId)).then(setDetalle).catch((e) => setError(e.message));
  }, [ordenActivaId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      produccionServicio.listarProductos(busquedaProducto).then(setProductosFabricados).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [busquedaProducto]);

  useEffect(() => {
    const validos = productos.filter((p) => p.producto_id && p.variante_id && p.cantidad_programada);
    if (!validos.length) {
      setResumenInsumos([]);
      return;
    }
    const payload = {
      productos: validos.map((p) => ({ producto_id: Number(p.producto_id), variante_id: Number(p.variante_id), cantidad_programada: Number(p.cantidad_programada), producto: p.producto }))
    };
    produccionServicio.calcularInsumos(payload).then(setResumenInsumos).catch(() => setResumenInsumos([]));
  }, [productos]);

  const ordenesFiltradas = useMemo(() => {
    const f = busqueda.trim().toLowerCase();
    return ordenes.filter((o) => {
      const pasaEstado = filtroEstado === 'todos' ? true : o.estado === filtroEstado;
      const pasaTexto = !f ? true : `${o.codigo_orden} ${o.responsable_email || ''} ${o.fecha_produccion}`.toLowerCase().includes(f);
      return pasaEstado && pasaTexto;
    });
  }, [ordenes, busqueda, filtroEstado]);

  const advertenciasTiempo = [
    alertaRango('Temperatura de crecimiento', tiempo.temperatura_crecimiento, 25, 35),
    tiempo.es_bagel ? alertaRango('Temperatura de inmersion', tiempo.temperatura_inmersion_agua, 85, 95) : null,
    alertaRango('Temperatura de horneo', tiempo.temperatura_horneo, 150, 175)
  ].filter(Boolean);

  return (
    <div className="tarjeta">
      <div className="tabs-produccion">
        {tabsDisponibles.map((key) => (
          <button key={key} type="button" className={`tab-produccion ${tab === key ? 'activa' : ''}`} onClick={() => setTab(key)}>
            {key === TABS.ORDENES ? 'Ordenes de produccion' : key === TABS.NUEVA ? 'Nueva orden' : key === TABS.ACTIVA ? 'Orden activa' : key === TABS.PRODUCTOS ? 'Productos' : 'Tiempos de produccion'}
          </button>
        ))}
      </div>

      {tab === TABS.ORDENES && !esOperario && (
        <>
          <div className="grid grid-2" style={{ marginBottom: 12 }}>
            <div className="campo"><label>Buscar</label><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
            <div className="campo"><label>Estado</label><select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="todos">todos</option><option value="pendiente">pendiente</option><option value="en_proceso">en_proceso</option><option value="finalizada">finalizada</option><option value="cancelada">cancelada</option></select></div>
          </div>
          <div className="acciones"><button className="boton" type="button" onClick={() => setTab(TABS.NUEVA)}>Nueva orden</button></div>
          <table className="tabla"><thead><tr><th># orden</th><th>Fecha</th><th>Responsable</th><th>Estado</th><th>Total programada</th><th>Total producida</th><th>Accion</th></tr></thead><tbody>{ordenesFiltradas.map((o) => <tr key={o.id}><td>{o.codigo_orden}</td><td>{String(o.fecha_produccion).slice(0, 10)}</td><td>{o.responsable_email || o.responsable_produccion}</td><td><span className={`estado ${o.estado}`}>{o.estado}</span></td><td>{o.cantidad_total_programada}</td><td>{o.cantidad_total_producida}</td><td><button className="boton secundario" type="button" onClick={() => { setOrdenActivaId(String(o.id)); setTab(TABS.ACTIVA); }}>Ver detalle</button></td></tr>)}</tbody></table>
        </>
      )}

      {tab === TABS.NUEVA && (
        <>
          <div className="acciones" style={{ marginTop: 0 }}>
            <button className="boton" type="button" onClick={() => setMostrarFormularioOrden(true)}>Nueva orden de produccion</button>
          </div>
          {resumenInsumos.length > 0 && (
            <>
              <h4>Resumen de insumos necesarios</h4>
              <table className="tabla"><thead><tr><th>Producto</th><th>Variante</th><th>Materia prima</th><th>Cant. por unidad</th><th>Cant. programada</th><th>Cant. total</th><th>Unidad</th><th>Disponible</th><th>Estado</th></tr></thead><tbody>{resumenInsumos.map((r, i) => <tr key={`${r.producto_id}-${r.variante_id}-${r.materia_prima_id}-${i}`}><td>{r.producto}</td><td>{r.variante || '-'}</td><td>{r.materia_prima}</td><td>{r.cantidad_por_unidad}</td><td>{r.cantidad_programada_producto}</td><td>{r.cantidad_total_requerida}</td><td>{r.unidad_medida}</td><td>{r.inventario_disponible}</td><td><span className={`estado ${r.estado === 'suficiente' ? 'aceptado' : r.estado === 'insuficiente' ? 'rechazado' : 'en_proceso'}`}>{r.estado}</span></td></tr>)}</tbody></table>
              {resumenInsumos.some((r) => r.estado === 'insuficiente') && <div className="alerta error">No hay suficiente inventario disponible para esta materia prima.</div>}
            </>
          )}
          {mostrarFormularioOrden && <div className="modal-fondo" onClick={() => setMostrarFormularioOrden(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-encabezado-form"><button className="boton secundario modal-cancelar" type="button" onClick={() => setMostrarFormularioOrden(false)}>Cancelar</button><h3>Nueva orden de produccion</h3></div><form onSubmit={async (e) => {
          e.preventDefault(); setError(''); setMessage('');
          try {
            const payloadProductos = productos.map((p) => ({
              producto_id: Number(p.producto_id),
              variante_id: Number(p.variante_id),
              producto: p.producto,
              tamano_presentacion: p.tamano_presentacion,
              cantidad_programada: Number(p.cantidad_programada),
              observaciones: p.observaciones || ''
            }));

            const payloadOrden = {
              ...formOrden,
              responsable_produccion: esOperario ? String(usuario?.id || '') : formOrden.responsable_produccion
            };

            const created = await produccionServicio.crearOrden({ ...payloadOrden, productos: payloadProductos });
            setOrdenActivaId(String(created.id));
            setMessage('Orden creada correctamente');
            await recargar();
            setMostrarFormularioOrden(false);
            setTab(TABS.ACTIVA);
          } catch (err) { setError(err.message); }
        }}>
          <div className="grid grid-2">
            <div className="campo"><label>Fecha de produccion</label><input type="date" value={formOrden.fecha_produccion} onChange={(e) => setFormOrden({ ...formOrden, fecha_produccion: e.target.value })} required /></div>
            <div className="campo"><label>Codigo de orden</label><input value={formOrden.codigo_orden} onChange={(e) => setFormOrden({ ...formOrden, codigo_orden: e.target.value })} required /></div>
            {esOperario ? (
              <div className="campo"><label>Responsable</label><input value={`${usuario?.email || 'operario'} (operario)`} readOnly /></div>
            ) : (
              <div className="campo"><label>Responsable (operario)</label><select value={formOrden.responsable_produccion} onChange={(e) => setFormOrden({ ...formOrden, responsable_produccion: e.target.value })} required><option value="">Selecciona operario</option>{operarios.map((u) => <option key={u.id} value={u.id}>{u.email} - {u.role}</option>)}</select></div>
            )}
            <div className="campo"><label>Estado inicial</label><select value={formOrden.estado} onChange={(e) => setFormOrden({ ...formOrden, estado: e.target.value })}><option value="pendiente">pendiente</option><option value="en_proceso">en_proceso</option><option value="finalizada">finalizada</option><option value="cancelada">cancelada</option></select></div>
          </div>
          <div className="campo" style={{ marginTop: 10 }}><label>Observaciones</label><textarea value={formOrden.observaciones} onChange={(e) => setFormOrden({ ...formOrden, observaciones: e.target.value })} /></div>

          <h4>Productos a fabricar</h4>
          {productos.map((p, index) => (
            <div key={index} className="grid grid-3" style={{ marginBottom: 10 }}>
              <div className="campo"><label>Producto</label><select value={p.producto_id} onChange={(e) => { const elegido = productosFabricados.find((x) => String(x.id) === String(e.target.value)); const variante = elegido?.variantes?.find((v) => v.estado === 'activo') || elegido?.variantes?.[0]; const copy = [...productos]; copy[index] = { ...copy[index], producto_id: e.target.value, variante_id: variante?.id ? String(variante.id) : '', producto: elegido?.nombre || '', tamano_presentacion: variante?.tamano_presentacion || 'mediano' }; setProductos(copy); }} required><option value="">Selecciona producto</option>{productosFabricados.filter((x) => x.estado === 'activo').map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></div>
              <div className="campo"><label>Variante / tamano</label><select value={p.variante_id} onChange={(e) => { const elegido = productosFabricados.find((x) => String(x.id) === String(p.producto_id)); const variante = elegido?.variantes?.find((v) => String(v.id) === String(e.target.value)); const copy = [...productos]; copy[index] = { ...copy[index], variante_id: e.target.value, tamano_presentacion: variante?.tamano_presentacion || copy[index].tamano_presentacion }; setProductos(copy); }} required><option value="">Selecciona variante</option>{(productosFabricados.find((x) => String(x.id) === String(p.producto_id))?.variantes || []).filter((v) => v.estado === 'activo').map((v) => <option key={v.id} value={v.id}>{v.tamano_presentacion}</option>)}</select></div>
              <div className="campo"><label>Cantidad programada</label><input type="number" min="0.01" value={p.cantidad_programada} onChange={(e) => { const copy = [...productos]; copy[index] = { ...copy[index], cantidad_programada: e.target.value }; setProductos(copy); }} required /></div>
              <div className="campo"><label>Observaciones del producto</label><input value={p.observaciones || ''} onChange={(e) => { const copy = [...productos]; copy[index] = { ...copy[index], observaciones: e.target.value }; setProductos(copy); }} /></div>
            </div>
          ))}
          <div className="acciones"><button className="boton secundario" type="button" onClick={() => setProductos([...productos, { producto_id: '', variante_id: '', producto: '', tamano_presentacion: 'mediano', cantidad_programada: '', observaciones: '' }])}>Agregar producto</button><button className="boton" type="submit">Guardar orden</button></div>
        </form></div></div>}
        </>
      )}

      {tab === TABS.ACTIVA && (
        <>
          <div className="campo" style={{ marginBottom: 12 }}><label>Seleccionar orden activa</label><select value={ordenActivaId} onChange={(e) => setOrdenActivaId(e.target.value)}><option value="">Selecciona</option>{ordenes.map((o) => <option key={o.id} value={o.id}>{o.codigo_orden} - {String(o.fecha_produccion).slice(0, 10)}</option>)}</select></div>
          {detalle?.orden && (
            <>
              <p><strong>Estado:</strong> <span className={`estado ${detalle.orden.estado}`}>{detalle.orden.estado}</span></p>
              <div className="acciones"><button className="boton secundario" type="button" onClick={async () => { await produccionServicio.actualizarEstadoOrden(detalle.orden.id, { estado: 'en_proceso' }); await recargar(); setDetalle(await produccionServicio.obtenerOrden(detalle.orden.id)); }}>Marcar en proceso</button><button className="boton" type="button" onClick={async () => { await produccionServicio.actualizarEstadoOrden(detalle.orden.id, { estado: 'finalizada' }); await recargar(); setDetalle(await produccionServicio.obtenerOrden(detalle.orden.id)); }}>Marcar finalizada</button></div>
              <h4>Productos programados</h4>
              <table className="tabla"><thead><tr><th>Producto</th><th>Tamano</th><th>Programada</th><th>Referencia estandar</th></tr></thead><tbody>{detalle.productos.map((p) => <tr key={p.id}><td>{p.producto}</td><td>{p.tamano_presentacion}</td><td>{p.cantidad_programada}</td><td>{p.observaciones || '-'}</td></tr>)}</tbody></table>
              <h4>Materias primas asociadas</h4>
              <table className="tabla"><thead><tr><th>Materia</th><th>Lote recepcion</th><th>Unidad</th><th>Planificada</th><th>Real</th><th>Accion</th></tr></thead><tbody>{detalle.materias.map((m) => <tr key={m.id}><td>{m.nombre_ingrediente}</td><td>{m.numero_lote || m.lote_proveedor}</td><td>{m.unidad_medida}</td><td>{m.cantidad_planificada}</td><td>{m.cantidad_real}</td><td><button className="boton secundario" type="button" onClick={async () => { const nuevo = window.prompt('Nueva cantidad real utilizada', String(m.cantidad_real)); if (!nuevo) return; await produccionServicio.actualizarCantidadRealMateria(detalle.orden.id, m.id, { cantidad_real: Number(nuevo) }); setDetalle(await produccionServicio.obtenerOrden(detalle.orden.id)); }}>Editar real</button></td></tr>)}</tbody></table>
            </>
          )}
        </>
      )}

      {tab === TABS.PRODUCTOS && !esOperario && (
        <>
          <div className="campo" style={{ marginBottom: 10 }}><label>Buscar productos</label><input value={busquedaProducto} onChange={(e) => setBusquedaProducto(e.target.value)} /></div>
          <div className="acciones"><button className="boton" type="button" onClick={() => { setMostrarFormularioProducto((v) => !v); if (!mostrarFormularioProducto) setDetalleProducto(null); }}>{mostrarFormularioProducto ? 'Ocultar formulario' : 'Agregar producto'}</button></div>
          <table className="tabla" style={{ marginTop: 10 }}><thead><tr><th>Nombre</th><th>Categoria</th><th>Variantes</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{productosFabricados.map((p) => <tr key={p.id}><td>{p.nombre}</td><td>{p.categoria || '-'}</td><td>{p.variantes?.length || 0}</td><td>{p.estado}</td><td><div className="acciones" style={{ marginTop: 0 }}><button className="boton secundario" type="button" onClick={async () => { const det = await produccionServicio.obtenerProducto(p.id); setDetalleProducto(det); }}>Ver detalle</button><button className="boton secundario" type="button" onClick={async () => { const det = await produccionServicio.obtenerProducto(p.id); const variantesEditables = (det.variantes || []).map((v) => ({ tamano_presentacion: v.tamano_presentacion, peso_estimado_unidad: v.peso_estimado_unidad || '', unidad_medida: v.unidad_medida || 'unidad', estado: v.estado || 'activo', receta: (v.receta || []).map((x) => ({ materia_prima_id: String(x.materia_prima_id), cantidad_requerida: String(x.cantidad_requerida), observaciones: x.observaciones || '' })) })); setDetalleProducto(det); setMostrarFormularioProducto(true); setFormProducto({ id: det.id, nombre: det.nombre, categoria: det.categoria || '', descripcion: det.descripcion || '', vida_util_dias: det.vida_util_dias, condiciones_almacenamiento: det.condiciones_almacenamiento || '', estado: det.estado, requiere_inmersion: Boolean(det.requiere_inmersion), tiempo_fermentacion_minutos: det.tiempo_fermentacion_minutos ?? '', temperatura_fermentacion_c: det.temperatura_fermentacion_c ?? '', tiempo_horneado_minutos: det.tiempo_horneado_minutos ?? '', temperatura_horneado_c: det.temperatura_horneado_c ?? '', tiempo_inmersion_minutos: det.tiempo_inmersion_minutos ?? '', temperatura_inmersion_c: det.temperatura_inmersion_c ?? '', variantes: variantesEditables.length ? variantesEditables : [varianteVacia()] }); }}>Actualizar informacion</button></div></td></tr>)}</tbody></table>
          {mostrarFormularioProducto && <div className="modal-fondo" onClick={() => setMostrarFormularioProducto(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-encabezado-form"><button className="boton secundario modal-cancelar" type="button" onClick={() => setMostrarFormularioProducto(false)}>Cancelar</button><h3>{formProducto.id ? 'Actualizar producto' : 'Agregar producto'}</h3></div><form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const payload = {
                ...formProducto,
                tiempo_fermentacion_minutos: Number(formProducto.tiempo_fermentacion_minutos || 0),
                temperatura_fermentacion_c: Number(formProducto.temperatura_fermentacion_c || 0),
                tiempo_horneado_minutos: Number(formProducto.tiempo_horneado_minutos || 0),
                temperatura_horneado_c: Number(formProducto.temperatura_horneado_c || 0),
                tiempo_inmersion_minutos: Number(formProducto.tiempo_inmersion_minutos || 0),
                temperatura_inmersion_c: Number(formProducto.temperatura_inmersion_c || 0),
                variantes: formProducto.variantes.map((v) => ({
                  ...v,
                  peso_estimado_unidad: v.peso_estimado_unidad ? Number(v.peso_estimado_unidad) : null,
                  receta: v.receta.map((r) => ({ materia_prima_id: Number(r.materia_prima_id), cantidad_requerida: Number(r.cantidad_requerida), observaciones: r.observaciones || '' }))
                }))
              };
              if (formProducto.id) {
                await produccionServicio.actualizarProducto(formProducto.id, payload);
                setMessage('Producto actualizado');
              } else {
                await produccionServicio.crearProducto(payload);
                setMessage('Producto creado');
              }
              setFormProducto(productoVacio());
              setMostrarFormularioProducto(false);
              setProductosFabricados(await produccionServicio.listarProductos(busquedaProducto));
            } catch (err) { setError(err.message); }
          }} style={{ marginTop: 12 }}>
            <div className="grid grid-3">
              <div className="campo"><label>Nombre</label><input value={formProducto.nombre} onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })} required /></div>
              <div className="campo"><label>Categoria</label><input value={formProducto.categoria} onChange={(e) => setFormProducto({ ...formProducto, categoria: e.target.value })} /></div>
              <div className="campo"><label>Vida util (dias)</label><input type="number" min="1" value={formProducto.vida_util_dias} onChange={(e) => setFormProducto({ ...formProducto, vida_util_dias: e.target.value })} required /></div>
              <div className="campo"><label>Estado</label><select value={formProducto.estado} onChange={(e) => setFormProducto({ ...formProducto, estado: e.target.value })}><option value="activo">activo</option><option value="inactivo">inactivo</option></select></div>
              <div className="campo"><label>Condiciones almacenamiento</label><input value={formProducto.condiciones_almacenamiento} onChange={(e) => setFormProducto({ ...formProducto, condiciones_almacenamiento: e.target.value })} /></div>
              <div className="campo"><label>Requiere inmersion</label><select value={String(formProducto.requiere_inmersion)} onChange={(e) => setFormProducto({ ...formProducto, requiere_inmersion: e.target.value === 'true' })}><option value="false">no</option><option value="true">si</option></select></div>
              <div className="campo"><label>Tiempo fermentacion (min)</label><input type="number" min="0" value={formProducto.tiempo_fermentacion_minutos} onChange={(e) => setFormProducto({ ...formProducto, tiempo_fermentacion_minutos: e.target.value })} /></div>
              <div className="campo"><label>Temperatura fermentacion (C)</label><input type="number" value={formProducto.temperatura_fermentacion_c} onChange={(e) => setFormProducto({ ...formProducto, temperatura_fermentacion_c: e.target.value })} /></div>
              <div className="campo"><label>Tiempo horneado (min)</label><input type="number" min="0" value={formProducto.tiempo_horneado_minutos} onChange={(e) => setFormProducto({ ...formProducto, tiempo_horneado_minutos: e.target.value })} /></div>
              <div className="campo"><label>Temperatura horneado (C)</label><input type="number" value={formProducto.temperatura_horneado_c} onChange={(e) => setFormProducto({ ...formProducto, temperatura_horneado_c: e.target.value })} /></div>
              {formProducto.requiere_inmersion && <div className="campo"><label>Tiempo inmersion (min)</label><input type="number" min="0" value={formProducto.tiempo_inmersion_minutos} onChange={(e) => setFormProducto({ ...formProducto, tiempo_inmersion_minutos: e.target.value })} /></div>}
              {formProducto.requiere_inmersion && <div className="campo"><label>Temperatura inmersion (C)</label><input type="number" value={formProducto.temperatura_inmersion_c} onChange={(e) => setFormProducto({ ...formProducto, temperatura_inmersion_c: e.target.value })} /></div>}
            </div>
            <div className="campo" style={{ marginTop: 8 }}><label>Descripcion</label><textarea value={formProducto.descripcion} onChange={(e) => setFormProducto({ ...formProducto, descripcion: e.target.value })} /></div>
            <h4>Variantes y recetas</h4>
            {formProducto.variantes.map((v, vIdx) => (
              <div key={vIdx} className="tarjeta" style={{ marginBottom: 10, position: 'relative' }}>
                {formProducto.variantes.length > 1 && <button type="button" aria-label="Eliminar variante" className="boton secundario" style={{ position: 'absolute', right: 10, top: 10, padding: '4px 9px' }} onClick={() => setFormProducto({ ...formProducto, variantes: formProducto.variantes.filter((_, i) => i !== vIdx) })}>X</button>}
                <div className="grid grid-3">
                  <div className="campo"><label>Tamano/presentacion</label><select value={v.tamano_presentacion} onChange={(e) => { const copy = [...formProducto.variantes]; copy[vIdx] = { ...copy[vIdx], tamano_presentacion: e.target.value }; setFormProducto({ ...formProducto, variantes: copy }); }}><option>grande</option><option>mediano</option><option>pequeno</option><option>personal</option><option>mini</option><option>cocktail</option></select></div>
                  <div className="campo"><label>Peso estimado por unidad</label><input type="number" min="0" step="0.001" value={v.peso_estimado_unidad} onChange={(e) => { const copy = [...formProducto.variantes]; copy[vIdx] = { ...copy[vIdx], peso_estimado_unidad: e.target.value }; setFormProducto({ ...formProducto, variantes: copy }); }} /></div>
                  <div className="campo"><label>Unidad variante</label><input value={v.unidad_medida} onChange={(e) => { const copy = [...formProducto.variantes]; copy[vIdx] = { ...copy[vIdx], unidad_medida: e.target.value }; setFormProducto({ ...formProducto, variantes: copy }); }} /></div>
                  <div className="campo"><label>Estado variante</label><select value={v.estado} onChange={(e) => { const copy = [...formProducto.variantes]; copy[vIdx] = { ...copy[vIdx], estado: e.target.value }; setFormProducto({ ...formProducto, variantes: copy }); }}><option value="activo">activo</option><option value="inactivo">inactivo</option></select></div>
                </div>
                <h4>Receta de la variante</h4>
                {v.receta.map((r, idx) => (
                  <div key={idx} className="grid grid-3" style={{ marginBottom: 8 }}>
                    <div className="campo"><label>Materia prima</label><select value={r.materia_prima_id} onChange={(e) => { const copy = [...formProducto.variantes]; copy[vIdx].receta[idx] = { ...copy[vIdx].receta[idx], materia_prima_id: e.target.value }; setFormProducto({ ...formProducto, variantes: copy }); }} required><option value="">Selecciona</option>{materiasPrimas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                    <div className="campo"><label>Cantidad por unidad</label><input type="number" min="0.001" step="0.001" value={r.cantidad_requerida} onChange={(e) => { const copy = [...formProducto.variantes]; copy[vIdx].receta[idx] = { ...copy[vIdx].receta[idx], cantidad_requerida: e.target.value }; setFormProducto({ ...formProducto, variantes: copy }); }} required /></div>
                    <div className="campo"><label>Observaciones</label><input value={r.observaciones || ''} onChange={(e) => { const copy = [...formProducto.variantes]; copy[vIdx].receta[idx] = { ...copy[vIdx].receta[idx], observaciones: e.target.value }; setFormProducto({ ...formProducto, variantes: copy }); }} /></div>
                  </div>
                ))}
                <div className="acciones"><button type="button" className="boton secundario" onClick={() => { const copy = [...formProducto.variantes]; copy[vIdx] = { ...copy[vIdx], receta: [...copy[vIdx].receta, recetaVacia()] }; setFormProducto({ ...formProducto, variantes: copy }); }}>Agregar materia prima</button></div>
              </div>
            ))}
            <div className="acciones"><button type="button" className="boton secundario" onClick={() => setFormProducto({ ...formProducto, variantes: [...formProducto.variantes, varianteVacia()] })}>Agregar variante</button><button className="boton" type="submit">{formProducto.id ? 'Actualizar producto' : 'Crear producto'}</button></div>
          </form></div></div>}
          {detalleProducto && <div className="tarjeta" style={{ marginTop: 10 }}><h4>Detalle de producto: {detalleProducto.nombre}</h4><p><strong>Categoria:</strong> {detalleProducto.categoria || '-'}</p><p><strong>Vida util:</strong> {detalleProducto.vida_util_dias} dias</p><p><strong>Tiempos estandar:</strong> Fermentacion {detalleProducto.tiempo_fermentacion_minutos}m ({detalleProducto.temperatura_fermentacion_c}C), Horneado {detalleProducto.tiempo_horneado_minutos}m ({detalleProducto.temperatura_horneado_c}C), {detalleProducto.requiere_inmersion ? `Inmersion ${detalleProducto.tiempo_inmersion_minutos}m (${detalleProducto.temperatura_inmersion_c}C)` : 'Sin inmersion'}</p>{detalleProducto.variantes?.map((v) => <div key={v.id} style={{ marginTop: 10 }}><h4>{v.tamano_presentacion}</h4><table className="tabla"><thead><tr><th>Materia prima</th><th>Cantidad por unidad</th><th>Unidad</th><th>Obs</th></tr></thead><tbody>{v.receta.map((r, i) => <tr key={i}><td>{r.materia_prima}</td><td>{r.cantidad_requerida}</td><td>{r.unidad_medida_base || r.unidad_medida}</td><td>{r.observaciones || '-'}</td></tr>)}</tbody></table></div>)}</div>}
        </>
      )}

      {tab === TABS.TIEMPOS && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await produccionServicio.registrarTiempos(Number(ordenActivaId), { registros: [tiempo] });
            setMessage('Tiempo registrado');
            if (ordenActivaId) setDetalle(await produccionServicio.obtenerOrden(Number(ordenActivaId)));
          } catch (err) { setError(err.message); }
        }}>
          <div className="campo"><label>Orden</label><select value={ordenActivaId} onChange={(e) => setOrdenActivaId(e.target.value)} required><option value="">Selecciona</option>{ordenes.map((o) => <option key={o.id} value={o.id}>{o.codigo_orden}</option>)}</select></div>
          <div className="grid grid-2">
            <div className="campo"><label>Producto</label><input value={tiempo.producto} onChange={(e) => setTiempo({ ...tiempo, producto: e.target.value })} required /></div>
            <div className="campo"><label>Lote</label><input value={tiempo.lote_producto} onChange={(e) => setTiempo({ ...tiempo, lote_producto: e.target.value })} required /></div>
            <div className="campo"><label>Unidades producidas</label><input type="number" min="0" value={tiempo.unidades_producidas} onChange={(e) => setTiempo({ ...tiempo, unidades_producidas: e.target.value })} required /></div>
            <div className="campo"><label>Carro / escabiladero</label><input value={tiempo.numero_carro_escabiladero} onChange={(e) => setTiempo({ ...tiempo, numero_carro_escabiladero: e.target.value })} required /></div>
            <div className="campo"><label>Tiempo crecimiento (min)</label><input type="number" min="0" value={tiempo.tiempo_crecimiento_min} onChange={(e) => setTiempo({ ...tiempo, tiempo_crecimiento_min: e.target.value })} required /></div>
            <div className="campo"><label>Temperatura crecimiento</label><input type="number" value={tiempo.temperatura_crecimiento} onChange={(e) => setTiempo({ ...tiempo, temperatura_crecimiento: e.target.value })} required /></div>
            <div className="campo"><label>Aplica inmersion (bagel)</label><input type="checkbox" checked={tiempo.es_bagel} onChange={(e) => setTiempo({ ...tiempo, es_bagel: e.target.checked })} /></div>
            <div className="campo"><label>Tiempo inmersion (seg)</label><input type="number" min="0" value={tiempo.tiempo_inmersion_agua_seg} onChange={(e) => setTiempo({ ...tiempo, tiempo_inmersion_agua_seg: e.target.value })} /></div>
            <div className="campo"><label>Temperatura inmersion</label><input type="number" value={tiempo.temperatura_inmersion_agua} onChange={(e) => setTiempo({ ...tiempo, temperatura_inmersion_agua: e.target.value })} /></div>
            <div className="campo"><label>Tiempo horneo (min)</label><input type="number" min="0" value={tiempo.tiempo_horneo_min} onChange={(e) => setTiempo({ ...tiempo, tiempo_horneo_min: e.target.value })} required /></div>
            <div className="campo"><label>Temperatura horneo</label><input type="number" value={tiempo.temperatura_horneo} onChange={(e) => setTiempo({ ...tiempo, temperatura_horneo: e.target.value })} required /></div>
            <div className="campo"><label>Observaciones</label><input value={tiempo.observaciones} onChange={(e) => setTiempo({ ...tiempo, observaciones: e.target.value })} /></div>
          </div>
          {advertenciasTiempo.length > 0 && <div className="alerta error">{advertenciasTiempo.join(' | ')}</div>}
          <div className="acciones"><button className="boton" type="submit">Registrar tiempos</button></div>
        </form>
      )}

      {tab === TABS.ACTIVA && !esOperario && ordenActivaId && (
        <>
          <div className="acciones"><button className="boton" type="button" onClick={() => setMostrarFormularioMateria(true)}>Asociar materias primas</button></div>
          {mostrarFormularioMateria && <div className="modal-fondo" onClick={() => setMostrarFormularioMateria(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-encabezado-form"><button className="boton secundario modal-cancelar" type="button" onClick={() => setMostrarFormularioMateria(false)}>Cancelar</button><h3>Asociar materias primas</h3></div><form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await produccionServicio.asociarMaterias(Number(ordenActivaId), {
              materias: [{
                orden_producto_id: Number(materia.orden_producto_id),
                recepcion_id: Number(materia.recepcion_id),
                nombre_ingrediente: materia.nombre_ingrediente,
                cantidad_planificada: Number(materia.cantidad_planificada),
                cantidad_real: Number(materia.cantidad_real),
                unidad_medida: materia.unidad_medida,
                observaciones: materia.observaciones
              }]
            });
            setMessage('Materia prima asociada');
            setDetalle(await produccionServicio.obtenerOrden(Number(ordenActivaId)));
            setMostrarFormularioMateria(false);
          } catch (err) { setError(err.message); }
        }}>
          <div className="grid grid-3">
            <div className="campo"><label>Producto de la orden (id)</label><input value={materia.orden_producto_id} onChange={(e) => setMateria({ ...materia, orden_producto_id: e.target.value })} required /></div>
            <div className="campo"><label>Materia prima</label><select value={materia.materia_prima_id} onChange={(e) => setMateria({ ...materia, materia_prima_id: e.target.value })} required><option value="">Selecciona</option>{materiasPrimas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
            <div className="campo"><label>Recepcion asociada</label><select value={materia.recepcion_id} onChange={(e) => setMateria({ ...materia, recepcion_id: e.target.value })} required><option value="">Selecciona</option>{recepciones.map((r) => <option key={r.id} value={r.id}>{r.numero_lote || r.lote_proveedor}</option>)}</select></div>
            <div className="campo"><label>Unidad base</label><input value={materia.unidad_medida} readOnly /></div>
            <div className="campo"><label>Cantidad planificada</label><input type="number" min="0.01" value={materia.cantidad_planificada} onChange={(e) => setMateria({ ...materia, cantidad_planificada: e.target.value })} required /></div>
            <div className="campo"><label>Cantidad real utilizada</label><input type="number" min="0.01" value={materia.cantidad_real} onChange={(e) => setMateria({ ...materia, cantidad_real: e.target.value })} required /></div>
          </div>
          <div className="campo" style={{ marginTop: 8 }}><label>Observaciones</label><input value={materia.observaciones} onChange={(e) => setMateria({ ...materia, observaciones: e.target.value })} /></div>
          <div className="acciones"><button className="boton" type="submit">Agregar materia prima</button></div>
        </form></div></div>}
        </>
      )}

      {message && <div className="alerta ok">{message}</div>}
      {error && <div className="alerta error">{error}</div>}
    </div>
  );
}
