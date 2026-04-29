'use client';

import { useEffect, useState } from 'react';
import { materiasPrimasServicio } from '@/servicios/materias-primas.servicio';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { recepcionesServicio } from '@/servicios/recepciones.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';

const nuevoFormulario = (usuario) => ({
  proveedor_id: '',
  materia_prima_id: '',
  cantidad: '',
  presentacion: 'bulto',
  numero_lote: '',
  temperatura: '',
  fecha_vencimiento: '',
  observaciones: '',
  recibido_por: usuario?.id || '',
  estado_recepcion: 'aceptado',
  inspeccion_producto: {
    olor: false,
    color: false,
    textura: false,
    estado_empaque: false,
    certificado_calidad: false,
    observaciones_producto: '',
    decision_producto: 'aceptado'
  },
  inspeccion_vehiculo: {
    vehiculo: '',
    conductor: '',
    placa: '',
    limpieza_vehiculo: false,
    transporte_vehiculo: false,
    observaciones_vehiculo: ''
  }
});

export function FormularioRecepcion() {
  const usuario = obtenerUsuario();
  const [form, setForm] = useState(() => nuevoFormulario(usuario));
  const [proveedores, setProveedores] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [modalProducto, setModalProducto] = useState(false);
  const [modalVehiculo, setModalVehiculo] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([proveedoresServicio.listar(), materiasPrimasServicio.listar()])
      .then(([proveedoresData, materiasPrimasData]) => {
        setProveedores(proveedoresData);
        setMateriasPrimas(materiasPrimasData.filter((item) => item.is_active));
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await recepcionesServicio.crear({ ...form, fecha_recepcion: new Date().toISOString(), recibido_por: usuario?.id });
      setMessage('Recepcion registrada correctamente');
      setForm(nuevoFormulario(usuario));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <form className="tarjeta" onSubmit={handleSubmit}>
        <div className="grid grid-2">
          <div className="campo"><label>Fecha recepcion</label><input value={new Date().toLocaleString()} disabled /></div>
          <div className="campo"><label>Recibido por</label><input value={usuario?.email || usuario?.id || '-'} disabled /></div>
          <div className="campo"><label>Proveedor</label><select value={form.proveedor_id} onChange={(e) => setForm((p) => ({ ...p, proveedor_id: e.target.value }))} required><option value="">Selecciona proveedor</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
          <div className="campo"><label>Materia prima</label><select value={form.materia_prima_id} onChange={(e) => setForm((p) => ({ ...p, materia_prima_id: e.target.value }))} required><option value="">Selecciona materia prima</option>{materiasPrimas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
          <div className="campo"><label>Cantidad</label><input type="number" step="0.01" value={form.cantidad} onChange={(e) => setForm((p) => ({ ...p, cantidad: e.target.value }))} required /></div>
          <div className="campo"><label>Presentacion</label><select value={form.presentacion} onChange={(e) => setForm((p) => ({ ...p, presentacion: e.target.value }))}><option value="bulto">bulto</option><option value="caja">caja</option><option value="otro">otro</option></select></div>
          <div className="campo"><label>Numero lote</label><input value={form.numero_lote} onChange={(e) => setForm((p) => ({ ...p, numero_lote: e.target.value }))} required /></div>
          <div className="campo"><label>Temperatura</label><input type="number" step="0.1" value={form.temperatura} onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))} required /></div>
          <div className="campo"><label>Fecha vencimiento</label><input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm((p) => ({ ...p, fecha_vencimiento: e.target.value }))} required /></div>
          <div className="campo"><label>Estado final</label><select value={form.estado_recepcion} onChange={(e) => setForm((p) => ({ ...p, estado_recepcion: e.target.value }))}><option value="aceptado">aceptado</option><option value="rechazado">rechazado</option><option value="retenido">retenido</option></select></div>
        </div>
        <div className="campo" style={{ marginTop: 12 }}><label>Observaciones</label><textarea value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} /></div>
        <div className="acciones">
          <button type="button" className="boton secundario" onClick={() => setModalProducto(true)}>Inspeccion de producto</button>
          <button type="button" className="boton secundario" onClick={() => setModalVehiculo(true)}>Inspeccion de vehiculo</button>
          <button className="boton" type="submit">Guardar recepcion</button>
        </div>
        {message && <div className="alerta ok">{message}</div>}
        {error && <div className="alerta error">{error}</div>}
      </form>

      {modalProducto && (
        <div className="modal-fondo"><div className="modal"><h3>Inspeccion de producto</h3><div className="grid grid-2">{['olor','color','textura','estado_empaque','certificado_calidad'].map((k) => <label key={k}><input type="checkbox" checked={form.inspeccion_producto[k]} onChange={(e) => setForm((p) => ({ ...p, inspeccion_producto: { ...p.inspeccion_producto, [k]: e.target.checked } }))} /> {k.replace('_', ' ')}</label>)}</div><div className="campo" style={{ marginTop: 10 }}><label>Observaciones inspeccion de producto</label><textarea value={form.inspeccion_producto.observaciones_producto} onChange={(e) => setForm((p) => ({ ...p, inspeccion_producto: { ...p.inspeccion_producto, observaciones_producto: e.target.value } }))} /></div><div className="campo" style={{ marginTop: 10 }}><label>Decision producto</label><select value={form.inspeccion_producto.decision_producto} onChange={(e) => setForm((p) => ({ ...p, inspeccion_producto: { ...p.inspeccion_producto, decision_producto: e.target.value } }))}><option value="aceptado">aceptado</option><option value="rechazado">rechazado</option><option value="retenido">retenido</option></select></div><div className="acciones"><button className="boton" type="button" onClick={() => setModalProducto(false)}>Guardar</button></div></div></div>
      )}

      {modalVehiculo && (
        <div className="modal-fondo"><div className="modal"><h3>Inspeccion de vehiculo</h3><div className="grid grid-2"><div className="campo"><label>Vehiculo</label><input value={form.inspeccion_vehiculo.vehiculo} onChange={(e) => setForm((p) => ({ ...p, inspeccion_vehiculo: { ...p.inspeccion_vehiculo, vehiculo: e.target.value } }))} /></div><div className="campo"><label>Conductor</label><input value={form.inspeccion_vehiculo.conductor} onChange={(e) => setForm((p) => ({ ...p, inspeccion_vehiculo: { ...p.inspeccion_vehiculo, conductor: e.target.value } }))} /></div><div className="campo"><label>Placa</label><input value={form.inspeccion_vehiculo.placa} onChange={(e) => setForm((p) => ({ ...p, inspeccion_vehiculo: { ...p.inspeccion_vehiculo, placa: e.target.value } }))} /></div></div><div className="campo" style={{ marginTop: 8 }}><label><input type="checkbox" checked={form.inspeccion_vehiculo.limpieza_vehiculo} onChange={(e) => setForm((p) => ({ ...p, inspeccion_vehiculo: { ...p.inspeccion_vehiculo, limpieza_vehiculo: e.target.checked } }))} /> Cumple condiciones de limpieza</label></div><div className="campo" style={{ marginTop: 8 }}><label><input type="checkbox" checked={form.inspeccion_vehiculo.transporte_vehiculo} onChange={(e) => setForm((p) => ({ ...p, inspeccion_vehiculo: { ...p.inspeccion_vehiculo, transporte_vehiculo: e.target.checked } }))} /> Cumple condiciones de transporte</label></div><div className="campo" style={{ marginTop: 10 }}><label>Observaciones vehiculo</label><textarea value={form.inspeccion_vehiculo.observaciones_vehiculo} onChange={(e) => setForm((p) => ({ ...p, inspeccion_vehiculo: { ...p.inspeccion_vehiculo, observaciones_vehiculo: e.target.value } }))} /></div><div className="acciones"><button className="boton" type="button" onClick={() => setModalVehiculo(false)}>Guardar</button></div></div></div>
      )}
    </>
  );
}
