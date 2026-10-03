'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { documentosServicio } from '@/servicios/documentos.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { puedeAdministrar, ROLES } from '@/utilidades/roles';

const inicial = {
  tipo_documental: '', entidad_emisora: '', numero_documento: '',
  fecha_emision: '', fecha_vencimiento: '', observaciones: ''
};

export default function DocumentosPage() {
  const admin = puedeAdministrar(obtenerUsuario()?.role);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(inicial); const [archivo, setArchivo] = useState(null); const [mostrarAnulados, setMostrarAnulados] = useState(false);
  const [error, setError] = useState(''); const [mensaje, setMensaje] = useState(''); const [anulando, setAnulando] = useState(null);

  const cargar = async (todos = mostrarAnulados) => {
    try {
      setItems(await documentosServicio.listar(todos));
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (event) => {
    event.preventDefault(); setError(''); setMensaje('');
    const data = new FormData();
    data.append('archivo', archivo); data.append('tipo_documental', form.tipo_documental);
    data.append('entidad_emisora', form.entidad_emisora);
    if (form.numero_documento) data.append('numero_documento', form.numero_documento);
    if (form.fecha_emision) data.append('fecha_emision', form.fecha_emision);
    if (form.fecha_vencimiento) data.append('fecha_vencimiento', form.fecha_vencimiento);
    data.append('observaciones', form.observaciones);
    try {
      await documentosServicio.cargar(data); setMensaje('Documento almacenado en MinIO.'); setForm(inicial); setArchivo(null); event.target.reset(); await cargar();
    } catch (e) { setError(e.message); }
  };

  const descargar = async (documento) => {
    try { const blob = await documentosServicio.descargar(documento.id_documento); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = documento.nombre_original; a.click(); URL.revokeObjectURL(url); } catch (e) { setError(e.message); }
  };

  const anular = async (documento) => {
    if (!window.confirm(`¿Anular el documento ${documento.nombre_original}?`)) return;
    setError(''); setMensaje(''); setAnulando(documento.id_documento);
    try { await documentosServicio.anular(documento.id_documento); setMensaje('Documento anulado. El objeto permanece conservado en MinIO y deja de estar disponible para descarga.'); await cargar(true); } catch (e) { setError(e.message); } finally { setAnulando(null); }
  };

  return <GuardiaSesion><GuardiaRol permitido={[ROLES.GERENTE, ROLES.ADMINISTRADOR]}><ContenedorApp titulo="Documentos de inocuidad" subtitulo="Soportes sanitarios de la compañía para producción, auditorías e informes al INVIMA.">
    {(error || mensaje) && <div className={`alerta ${error ? 'error' : 'ok'}`}>{error || mensaje}</div>}
    {admin && <section className="tarjeta"><form onSubmit={guardar}><div className="grid grid-3">
      <div className="campo"><label>Tipo de documento</label><input required value={form.tipo_documental} placeholder="Ej. Acta de inspección sanitaria" onChange={(e) => setForm({ ...form, tipo_documental: e.target.value })} /></div>
      <div className="campo"><label>Entidad emisora</label><input required value={form.entidad_emisora} placeholder="Ej. INVIMA o Secretaría de Salud" onChange={(e) => setForm({ ...form, entidad_emisora: e.target.value })} /></div>
      <div className="campo"><label>Número o referencia</label><input value={form.numero_documento} placeholder="Opcional" onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} /></div>
      <div className="campo"><label>Emisión</label><input type="date" value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} /></div><div className="campo"><label>Vencimiento</label><input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} /></div>
      <div className="campo"><label>Archivo</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx" required onChange={(e) => setArchivo(e.target.files?.[0] || null)} /></div>
    </div><div className="campo"><label>Observaciones</label><textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div><div className="acciones"><button className="boton">Guardar documento de inocuidad</button></div></form></section>}
    <section className="tarjeta"><div className="acciones"><h3>Soportes documentales de la compañía</h3>{admin && <label className="check-linea"><input type="checkbox" checked={mostrarAnulados} onChange={(e) => { setMostrarAnulados(e.target.checked); cargar(e.target.checked); }} /> Mostrar anulados</label>}</div><div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Tipo</th><th>Entidad emisora</th><th>Número / referencia</th><th>Archivo</th><th>Vigencia</th><th>Estado</th><th>Tamaño</th><th>Acción</th></tr></thead><tbody>{items.map((x, index) => <tr key={`${x.id_documento}-${x.nombre_original || 'documento'}-${index}`}><td>{x.tipo_documental}</td><td>{x.entidad_emisora}</td><td>{x.numero_documento || 'Sin referencia'}</td><td>{x.nombre_original}</td><td>{x.fecha_vencimiento || 'Sin fecha'} <span className={`estado ${x.vigencia === 'vigente' ? 'aprobado' : 'retenido'}`}>{x.vigencia}</span></td><td><span className={`estado ${x.estado === 'activo' ? 'aprobado' : 'retenido'}`}>{x.estado}</span></td><td>{Math.ceil(Number(x.tamano_bytes) / 1024)} KB</td><td>{x.estado === 'activo' && <button className="boton secundario" onClick={() => descargar(x)}>Descargar</button>} {admin && x.estado === 'activo' && <button className="boton secundario" disabled={anulando === x.id_documento} onClick={() => anular(x)}>{anulando === x.id_documento ? 'Anulando...' : 'Anular'}</button>}</td></tr>)}</tbody></table></div></section>
  </ContenedorApp></GuardiaRol></GuardiaSesion>;
}
