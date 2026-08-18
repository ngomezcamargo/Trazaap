'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { saneamientoServicio } from '@/servicios/saneamiento.servicio';
import { ROLES } from '@/utilidades/roles';

export default function EjecucionSaneamientoPage() {
  const [items,setItems]=useState([]); const [ops,setOps]=useState([]); const [id,setId]=useState(''); const [responsable,setResponsable]=useState(''); const [resultado,setResultado]=useState(''); const [observaciones,setObservaciones]=useState(''); const [check,setCheck]=useState(''); const [error,setError]=useState('');
  const cargar=async()=>{try{const[a,b]=await Promise.all([saneamientoServicio.listar(),autenticacionServicio.listarOperarios()]);setItems(a.filter(x=>x.estado==='programada'));setOps(b)}catch(e){setError(e.message)}};
  useEffect(()=>{cargar()},[]);
  const seleccionada=items.find(x=>String(x.id_actividad)===id);
  const ejecutar=async(e)=>{e.preventDefault();if(!seleccionada)return;try{await saneamientoServicio.ejecutar(id,{tipo:seleccionada.tipo,procedimiento:seleccionada.procedimiento,fecha_programada:new Date(seleccionada.fecha_programada).toISOString(),fecha_ejecucion:new Date().toISOString(),responsable:Number(responsable),resultado,observaciones,lista_chequeo:check.split('\n').map(x=>x.trim()).filter(Boolean).map(item=>({item,cumple:true,observacion:''})),estado:'ejecutada'});setId('');setResponsable('');setResultado('');setObservaciones('');setCheck('');await cargar()}catch(x){setError(x.message)}};
  return <GuardiaSesion><GuardiaRol permitido={[ROLES.OPERARIO]}><ContenedorApp titulo="Ejecutar saneamiento" subtitulo="Ejecución de actividades programadas con histórico y evidencia.">{error&&<div className="alerta error">{error}</div>}<section className="tarjeta"><form onSubmit={ejecutar}><div className="campo"><label>Actividad programada</label><select required value={id} onChange={e=>{setId(e.target.value);const x=items.find(i=>String(i.id_actividad)===e.target.value);setCheck((x?.lista_chequeo||[]).map(i=>i.item).join('\n'))}}><option value="">Seleccione</option>{items.map(x=><option key={x.id_actividad} value={x.id_actividad}>{x.tipo} — {new Date(x.fecha_programada).toLocaleString()}</option>)}</select></div><div className="grid grid-3"><div className="campo"><label>Responsable</label><select required value={responsable} onChange={e=>setResponsable(e.target.value)}><option value="">Seleccione</option>{ops.map(x=><option key={x.id} value={x.id}>{x.email}</option>)}</select></div><div className="campo"><label>Resultado</label><input required value={resultado} onChange={e=>setResultado(e.target.value)}/></div></div><div className="campo"><label>Checklist ejecutado (un ítem por línea)</label><textarea value={check} onChange={e=>setCheck(e.target.value)}/></div><div className="campo"><label>Observaciones</label><textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)}/></div><div className="alerta info">PENDIENTE DE VALIDACIÓN DEL INGENIERO DE ALIMENTOS: plantillas sanitarias definitivas.</div><button className="boton">Registrar ejecución</button></form></section></ContenedorApp></GuardiaRol></GuardiaSesion>;
}
