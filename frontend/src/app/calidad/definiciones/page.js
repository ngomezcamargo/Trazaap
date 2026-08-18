'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { calidadServicio } from '@/servicios/calidad.servicio';
import { ROLES } from '@/utilidades/roles';

const vacia = { categoria: 'haccp_proceso', parametro: '', unidad: '', referencia: '', limite_minimo: '', limite_maximo: '', valor_esperado_texto: '', activo: true };
const preparar = (x) => ({ ...x, unidad: x.unidad || null, referencia: x.referencia || null, limite_minimo: x.limite_minimo === '' ? null : Number(x.limite_minimo), limite_maximo: x.limite_maximo === '' ? null : Number(x.limite_maximo), valor_esperado_texto: x.valor_esperado_texto || null });

export default function DefinicionesCalidadPage() {
  const [items, setItems] = useState([]); const [form, setForm] = useState(vacia); const [mensaje, setMensaje] = useState(''); const [error, setError] = useState('');
  const cargar = async () => { try { setItems(await calidadServicio.definiciones()); } catch (e) { setError(e.message); } };
  useEffect(() => { cargar(); }, []);
  const guardar = async (e) => { e.preventDefault(); setError(''); try { if (form.id_definicion) await calidadServicio.actualizarDefinicion(form.id_definicion, preparar(form)); else await calidadServicio.crearDefinicion(preparar(form)); setMensaje(form.id_definicion ? 'Definición actualizada.' : 'Definición creada.'); setForm(vacia); await cargar(); } catch (x) { setError(x.message); } };
  const editar = (x) => setForm({ ...x, unidad: x.unidad || '', referencia: x.referencia || '', limite_minimo: x.limite_minimo ?? '', limite_maximo: x.limite_maximo ?? '', valor_esperado_texto: x.valor_esperado_texto || '' });
  const alternar = async (x) => { setError(''); try { await calidadServicio.actualizarDefinicion(x.id_definicion, preparar({ ...x, activo: !x.activo })); await cargar(); } catch (e) { setError(e.message); } };
  return <GuardiaSesion><GuardiaRol permitido={[ROLES.ADMINISTRADOR]}><ContenedorApp titulo="Definiciones de calidad" subtitulo="Parámetros configurables RF07/RF08; sin límites regulatorios precargados.">
    {(error || mensaje) && <div className={`alerta ${error ? 'error' : 'ok'}`}>{error || mensaje}</div>}
    <section className="tarjeta"><form onSubmit={guardar}><div className="grid grid-3">
      <div className="campo"><label>Categoría</label><select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}><option value="haccp_proceso">HACCP/proceso</option><option value="fisico">Físico</option><option value="quimico">Químico</option><option value="microbiologico">Microbiológico</option><option value="organoleptico">Organoléptico</option><option value="producto_terminado">Producto terminado</option></select></div>
      <div className="campo"><label>Parámetro</label><input required value={form.parametro} onChange={(e) => setForm({ ...form, parametro: e.target.value })} /></div>
      <div className="campo"><label>Unidad</label><input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></div>
      <div className="campo"><label>Mínimo</label><input type="number" step="any" value={form.limite_minimo} onChange={(e) => setForm({ ...form, limite_minimo: e.target.value })} /></div>
      <div className="campo"><label>Máximo</label><input type="number" step="any" value={form.limite_maximo} onChange={(e) => setForm({ ...form, limite_maximo: e.target.value })} /></div>
      <div className="campo"><label>Valor esperado</label><input value={form.valor_esperado_texto} onChange={(e) => setForm({ ...form, valor_esperado_texto: e.target.value })} /></div>
    </div><div className="campo"><label>Referencia</label><textarea value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} /></div>
    <div className="alerta info">PENDIENTE DE VALIDACIÓN DEL INGENIERO DE ALIMENTOS: límites, referencias y reacción operacional definitiva.</div>
    <div className="acciones"><button className="boton">{form.id_definicion ? 'Guardar cambios' : 'Crear definición'}</button>{form.id_definicion && <button type="button" className="boton secundario" onClick={() => setForm(vacia)}>Cancelar</button>}</div></form></section>
    <section className="tarjeta"><div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Categoría</th><th>Parámetro</th><th>Referencia/rango</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{items.map((x) => <tr key={x.id_definicion}><td>{x.categoria}</td><td>{x.parametro}</td><td>{x.referencia || `${x.limite_minimo ?? '—'} – ${x.limite_maximo ?? '—'} ${x.unidad || ''}`}</td><td>{x.activo ? 'activo' : 'inactivo'}</td><td><button className="boton secundario" onClick={() => editar(x)}>Editar</button> <button className="boton secundario" onClick={() => alternar(x)}>{x.activo ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table></div></section>
  </ContenedorApp></GuardiaRol></GuardiaSesion>;
}
