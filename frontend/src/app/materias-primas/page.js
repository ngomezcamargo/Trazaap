'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { materiasPrimasServicio } from '@/servicios/materias-primas.servicio';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { ROLES } from '@/utilidades/roles';

const inicial = {
  id: null,
  nombre: '',
  descripcion: '',
  unidad_medida: 'kg',
  condiciones_almacenamiento: '',
  proveedor_id: '',
  is_active: true
};

export default function MateriasPrimasPage() {
  const [form, setForm] = useState(inicial);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  async function recargar() {
    const [mats, provs] = await Promise.all([materiasPrimasServicio.listar(), proveedoresServicio.listar()]);
    setItems(mats);
    setProveedores(provs);
  }

  useEffect(() => {
    recargar().catch((err) => setError(err.message));
  }, []);

  const filtradas = items.filter((item) => {
    const f = busqueda.trim().toLowerCase();
    if (!f) return true;
    return [item.nombre, item.descripcion, item.unidad_medida].join(' ').toLowerCase().includes(f);
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = { ...form, proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null };
    try {
      if (form.id) {
        await materiasPrimasServicio.actualizar(form.id, payload);
      } else {
        await materiasPrimasServicio.crear(payload);
      }
      setForm(inicial);
      await recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
      <ContenedorApp titulo="Materias primas" subtitulo="Catalogo base para recepcion de productos recibidos.">
        <form className="tarjeta" onSubmit={onSubmit}>
          <div className="grid grid-2">
            <div className="campo"><label>Nombre</label><input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required /></div>
            <div className="campo"><label>Unidad medida</label><input value={form.unidad_medida} onChange={(e) => setForm((p) => ({ ...p, unidad_medida: e.target.value }))} required /></div>
            <div className="campo"><label>Proveedor asociado</label><select value={form.proveedor_id} onChange={(e) => setForm((p) => ({ ...p, proveedor_id: e.target.value }))}><option value="">Sin asociar</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
            <div className="campo"><label>Estado</label><select value={String(form.is_active)} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'true' }))}><option value="true">activo</option><option value="false">inactivo</option></select></div>
          </div>
          <div className="campo" style={{ marginTop: 12 }}><label>Descripcion</label><textarea value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} /></div>
          <div className="campo" style={{ marginTop: 12 }}><label>Condiciones almacenamiento</label><textarea value={form.condiciones_almacenamiento} onChange={(e) => setForm((p) => ({ ...p, condiciones_almacenamiento: e.target.value }))} /></div>
          <div className="acciones"><button className="boton" type="submit">{form.id ? 'Actualizar materia prima' : 'Crear materia prima'}</button></div>
          {error && <div className="alerta error">{error}</div>}
        </form>

        <div className="tarjeta" style={{ marginTop: 14 }}>
          <div className="campo" style={{ marginBottom: 12 }}>
            <label>Buscar materia prima</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, unidad o descripcion" />
          </div>
          <table className="tabla">
            <thead><tr><th>ID</th><th>Nombre</th><th>Unidad</th><th>Proveedor</th><th>Estado</th><th></th></tr></thead>
            <tbody>{filtradas.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.nombre}</td><td>{item.unidad_medida}</td><td>{item.proveedor_nombre || '-'}</td><td>{item.is_active ? 'activo' : 'inactivo'}</td><td><button className="boton secundario" onClick={() => setForm({ ...item, proveedor_id: item.proveedor_id || '' })} type="button">Editar</button></td></tr>)}</tbody>
          </table>
        </div>
      </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
