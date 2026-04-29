'use client';

import { useState } from 'react';
import { liberacionServicio } from '@/servicios/liberacion.servicio';

const initialForm = {
  producto: '',
  lote_producto: '',
  fecha_vencimiento: '',
  unidades_liberadas: '',
  peso_neto: '',
  verificacion_etiqueta: true,
  verificacion_envase: true,
  numero_factura: '',
  cliente_destino: '',
  conductor: '',
  placa_vehiculo: '',
  limpieza_vehiculo: 'cumple',
  documentacion_dotacion: 'cumple',
  responsable_liberacion: '1',
  estado_liberacion: 'liberado',
  observaciones: ''
};

export function FormularioLiberacion() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      await liberacionServicio.crear(form);
      setMessage('Liberacion registrada');
      setError('');
      setForm(initialForm);
    } catch (err) {
      setError(err.message);
      setMessage('');
    }
  };

  return <form className="tarjeta" onSubmit={submit}><div className="grid grid-2">
    <div className="campo"><label>Producto</label><input required value={form.producto} onChange={(e)=>setForm({...form,producto:e.target.value})}/></div>
    <div className="campo"><label>Lote</label><input required value={form.lote_producto} onChange={(e)=>setForm({...form,lote_producto:e.target.value})}/></div>
    <div className="campo"><label>Fecha vencimiento</label><input type="date" required value={form.fecha_vencimiento} onChange={(e)=>setForm({...form,fecha_vencimiento:e.target.value})}/></div>
    <div className="campo"><label>Unidades liberadas</label><input type="number" min="0" required value={form.unidades_liberadas} onChange={(e)=>setForm({...form,unidades_liberadas:e.target.value})}/></div>
    <div className="campo"><label>Peso neto</label><input type="number" min="0.01" required value={form.peso_neto} onChange={(e)=>setForm({...form,peso_neto:e.target.value})}/></div>
    <div className="campo"><label>Factura</label><input value={form.numero_factura} onChange={(e)=>setForm({...form,numero_factura:e.target.value})}/></div>
    <div className="campo"><label>Cliente/destino</label><input value={form.cliente_destino} onChange={(e)=>setForm({...form,cliente_destino:e.target.value})}/></div>
    <div className="campo"><label>Conductor</label><input value={form.conductor} onChange={(e)=>setForm({...form,conductor:e.target.value})}/></div>
    <div className="campo"><label>Placa</label><input value={form.placa_vehiculo} onChange={(e)=>setForm({...form,placa_vehiculo:e.target.value})}/></div>
    <div className="campo"><label>Limpieza vehiculo</label><select value={form.limpieza_vehiculo} onChange={(e)=>setForm({...form,limpieza_vehiculo:e.target.value})}><option value="cumple">cumple</option><option value="no_cumple">no cumple</option></select></div>
    <div className="campo"><label>Documentacion/dotacion</label><select value={form.documentacion_dotacion} onChange={(e)=>setForm({...form,documentacion_dotacion:e.target.value})}><option value="cumple">cumple</option><option value="no_cumple">no cumple</option></select></div>
    <div className="campo"><label>Estado</label><select value={form.estado_liberacion} onChange={(e)=>setForm({...form,estado_liberacion:e.target.value})}><option>liberado</option><option>retenido</option><option>rechazado</option></select></div>
    <div className="campo"><label>Responsable</label><input required value={form.responsable_liberacion} onChange={(e)=>setForm({...form,responsable_liberacion:e.target.value})}/></div>
  </div><div className="campo"><label>Observaciones</label><textarea value={form.observaciones} onChange={(e)=>setForm({...form,observaciones:e.target.value})}/></div>
  <div className="acciones"><button className="boton" type="submit">Registrar liberacion</button></div>
  {message && <div className="alerta ok">{message}</div>}{error && <div className="alerta error">{error}</div>}
  </form>;
}
