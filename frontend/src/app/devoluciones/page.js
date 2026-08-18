'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { clientesServicio } from '@/servicios/clientes.servicio';
import { despachosServicio } from '@/servicios/despachos.servicio';
import { devolucionesServicio } from '@/servicios/devoluciones.servicio';
import { ROLES } from '@/utilidades/roles';

const inicial = { tipo_caso: 'devolucion_post_despacho', lote: '', id_cliente: '', id_despacho: '', cantidad: '', fecha_registro: '', motivo: '', accion: 'pendiente_decision', fecha_decision: '', responsable: '', observaciones: '' };

export default function DevolucionesPage() {
  const [casos, setCasos] = useState([]); const [clientes, setClientes] = useState([]);
  const [despachos, setDespachos] = useState([]); const [responsables, setResponsables] = useState([]);
  const [form, setForm] = useState(inicial); const [error, setError] = useState(''); const [mensaje, setMensaje] = useState('');
  const cargar = async () => { try { const [a,b,c,d] = await Promise.all([devolucionesServicio.listar(), clientesServicio.listarTodos(), despachosServicio.listar(), autenticacionServicio.listarOperarios()]); setCasos(a); setClientes(b); setDespachos(c); setResponsables(d); } catch (e) { setError(e.message); } };
  useEffect(() => { cargar(); }, []);
  const guardar = async (e) => { e.preventDefault(); setError(''); setMensaje(''); try {
    const post = form.tipo_caso === 'devolucion_post_despacho';
    const respuesta = await devolucionesServicio.crear({ ...form, id_cliente: post ? Number(form.id_cliente) : null, id_despacho: post ? Number(form.id_despacho) : null, cantidad: Number(form.cantidad), responsable: Number(form.responsable), fecha_registro: new Date(form.fecha_registro).toISOString(), fecha_decision: form.accion === 'pendiente_decision' ? null : new Date(form.fecha_decision).toISOString() });
    setMensaje(`Caso registrado. ${respuesta.inventario_modificado ? 'Inventario actualizado.' : 'Inventario sin cambios automáticos.'}`); setForm(inicial); await cargar();
  } catch (x) { setError(x.message); } };
  const post = form.tipo_caso === 'devolucion_post_despacho';
  return <GuardiaSesion><GuardiaRol permitido={[ROLES.GERENTE]}><ContenedorApp titulo="Devoluciones y no conformidades" subtitulo="RF16: distingue rechazo previo y devolución posterior al despacho.">
    {(error || mensaje) && <div className={`alerta ${error ? 'error' : 'ok'}`}>{error || mensaje}</div>}
    <section className="tarjeta"><form onSubmit={guardar}><div className="grid grid-3">
      <div className="campo"><label>Tipo de caso</label><select value={form.tipo_caso} onChange={e=>setForm({...form,tipo_caso:e.target.value,id_cliente:'',id_despacho:''})}><option value="devolucion_post_despacho">Devolucion posterior</option><option value="rechazo_pre_despacho">Rechazo antes del despacho</option></select></div>
      <div className="campo"><label>Lote</label><input required value={form.lote} onChange={e=>setForm({...form,lote:e.target.value})}/></div>
      <div className="campo"><label>Cantidad</label><input type="number" min="1" required value={form.cantidad} onChange={e=>setForm({...form,cantidad:e.target.value})}/></div>
      {post && <div className="campo"><label>Cliente</label><select required value={form.id_cliente} onChange={e=>setForm({...form,id_cliente:e.target.value})}><option value="">Seleccione</option>{clientes.map(x=><option key={x.id_cliente} value={x.id_cliente}>{x.nombre_razon_social}</option>)}</select></div>}
      {post && <div className="campo"><label>Despacho</label><select required value={form.id_despacho} onChange={e=>setForm({...form,id_despacho:e.target.value})}><option value="">Seleccione</option>{despachos.filter(x=>!form.id_cliente || Number(x.id_cliente)===Number(form.id_cliente)).map(x=><option key={x.id_despacho} value={x.id_despacho}>{x.codigo_despacho}</option>)}</select></div>}
      <div className="campo"><label>Fecha del caso</label><input type="datetime-local" required value={form.fecha_registro} onChange={e=>setForm({...form,fecha_registro:e.target.value})}/></div>
      <div className="campo"><label>Responsable</label><select required value={form.responsable} onChange={e=>setForm({...form,responsable:e.target.value})}><option value="">Seleccione</option>{responsables.map(x=><option key={x.id} value={x.id}>{x.email}</option>)}</select></div>
      <div className="campo"><label>Accion/decision</label><select value={form.accion} onChange={e=>setForm({...form,accion:e.target.value,fecha_decision:''})}><option value="pendiente_decision">Pendiente</option><option value="retiro">Retiro</option><option value="reproceso">Reproceso</option><option value="destruccion">Destruccion</option></select></div>
      {form.accion !== 'pendiente_decision' && <div className="campo"><label>Fecha decision</label><input type="datetime-local" required value={form.fecha_decision} onChange={e=>setForm({...form,fecha_decision:e.target.value})}/></div>}
    </div><div className="campo"><label>Motivo</label><textarea required value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})}/></div><div className="campo"><label>Observaciones</label><textarea value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})}/></div><div className="alerta info">Las devoluciones posteriores se registran sin reincorporar unidades al inventario hasta aprobar una política.</div><div className="acciones"><button className="boton">Registrar caso</button></div></form></section>
    <section className="tarjeta"><h3>Casos registrados</h3><div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Tipo</th><th>Lote</th><th>Cliente/despacho</th><th>Cantidad</th><th>Accion</th><th>Impacto inventario</th><th>Responsable</th></tr></thead><tbody>{casos.map(x=><tr key={x.id_caso}><td>{x.tipo_caso}</td><td>{x.lote}</td><td>{x.cliente || '-'}<small className="tabla-subtexto">{x.codigo_despacho || '-'}</small></td><td>{x.cantidad}</td><td>{x.accion}</td><td>{x.impacto_inventario}</td><td>{x.responsable_email}</td></tr>)}</tbody></table></div></section>
  </ContenedorApp></GuardiaRol></GuardiaSesion>;
}
