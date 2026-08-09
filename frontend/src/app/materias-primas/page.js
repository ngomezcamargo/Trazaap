'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { materiasPrimasServicio } from '@/servicios/materias-primas.servicio';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { puedeAdministrar, ROLES } from '@/utilidades/roles';

const inicial = {
  id: null,
  nombre: '',
  descripcion: '',
  unidad_medida_base: '',
  descripcion_unidad_personalizada: '',
  condiciones_almacenamiento: '',
  proveedor_id: '',
  is_active: true
};

export default function MateriasPrimasPage() {
  const usuario = obtenerUsuario();
  const puedeEditar = puedeAdministrar(usuario?.role);
  const [form, setForm] = useState(inicial);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoFormulario, setModoFormulario] = useState('crear');
  const [detalle, setDetalle] = useState(null);

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
    return [item.nombre, item.descripcion, item.unidad_medida_base || item.unidad_medida].join(' ').toLowerCase().includes(f);
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const payload = {
      ...form,
      proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
      tipo_insumo: null
    };
    try {
      if (form.id) {
        await materiasPrimasServicio.actualizar(form.id, payload);
        setMessage('Materia prima actualizada correctamente.');
      } else {
        await materiasPrimasServicio.crear(payload);
        setMessage('Materia prima creada correctamente.');
      }
      setForm(inicial);
      setModalAbierto(false);
      await recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const abrirCrear = () => {
    setDetalle(null);
    setError('');
    setMessage('');
    setForm(inicial);
    setModoFormulario('crear');
    setModalAbierto(true);
  };

  const abrirEditar = (item) => {
    setDetalle(null);
    setError('');
    setMessage('');
    setForm({
      ...item,
      unidad_medida_base: item.unidad_medida_base || item.unidad_medida || '',
      descripcion_unidad_personalizada: item.descripcion_unidad_personalizada || '',
      proveedor_id: item.proveedor_id || ''
    });
    setModoFormulario('editar');
    setModalAbierto(true);
  };

  const cerrarModalFormulario = () => {
    setModalAbierto(false);
    setForm(inicial);
    setModoFormulario('crear');
    setError('');
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
      <ContenedorApp titulo="Materias primas" subtitulo="Catalogo base para recepcion de productos recibidos.">
        <div className="tarjeta">
          {puedeEditar && (
            <div className="acciones" style={{ marginTop: 0, marginBottom: 12 }}>
              <button className="boton" type="button" onClick={abrirCrear}>Nueva materia prima</button>
            </div>
          )}
          <div className="campo" style={{ marginBottom: 12 }}>
            <label>Buscar materia prima</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, unidad o descripcion" />
          </div>
          <table className="tabla">
            <thead><tr><th>ID</th><th>Nombre</th><th>Unidad base</th><th>Proveedor</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>{filtradas.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.nombre}</td><td>{item.unidad_medida_base || item.unidad_medida}</td><td>{item.proveedor_nombre || '-'}</td><td>{item.is_active ? 'activo' : 'inactivo'}</td><td><div className="acciones" style={{ marginTop: 0 }}>{puedeEditar && <button className="boton secundario" onClick={() => abrirEditar(item)} type="button">Editar</button>}<button className="boton secundario" onClick={() => setDetalle(item)} type="button">Ver detalle</button></div></td></tr>)}</tbody>
          </table>
          {!modalAbierto && message && <div className="alerta ok">{message}</div>}
          {!modalAbierto && error && <div className="alerta error">{error}</div>}
        </div>

        {puedeEditar && modalAbierto && (
          <div className="modal-fondo" onClick={cerrarModalFormulario}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-encabezado-form">
                <button className="boton secundario modal-cancelar" type="button" onClick={cerrarModalFormulario}>Cancelar</button>
                <h3>{modoFormulario === 'crear' ? 'Nueva materia prima' : 'Editar materia prima'}</h3>
              </div>
              {message && <div className="alerta ok alerta-modal">{message}</div>}
              {error && <div className="alerta error alerta-modal">{error}</div>}
              <form onSubmit={onSubmit}>
                <div className="grid grid-2">
                  <div className="campo"><label>Nombre</label><input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required /></div>
                  <div className="campo"><label>Unidad de medida base</label><select value={form.unidad_medida_base} onChange={(e) => setForm((p) => ({ ...p, unidad_medida_base: e.target.value }))} required><option value="">Selecciona una unidad</option><option value="gramos">gramos</option><option value="kilogramos">kilogramos</option><option value="mililitros">mililitros</option><option value="litros">litros</option><option value="unidad">unidad</option><option value="docena">docena</option><option value="caja">caja</option><option value="paquete">paquete</option><option value="bulto">bulto</option><option value="otro">otro</option></select></div>
                  <div className="campo"><label>Proveedor asociado</label><select value={form.proveedor_id} onChange={(e) => setForm((p) => ({ ...p, proveedor_id: e.target.value }))}><option value="">Sin asociar</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
                  <div className="campo"><label>Estado</label><select value={String(form.is_active)} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'true' }))}><option value="true">activo</option><option value="false">inactivo</option></select></div>
                </div>
                {form.unidad_medida_base === 'otro' && (
                  <div className="campo" style={{ marginTop: 12 }}><label>Descripcion de unidad personalizada</label><input value={form.descripcion_unidad_personalizada} onChange={(e) => setForm((p) => ({ ...p, descripcion_unidad_personalizada: e.target.value }))} required /></div>
                )}
                <div className="campo" style={{ marginTop: 12 }}><label>Descripcion</label><textarea value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} /></div>
                <div className="campo" style={{ marginTop: 12 }}><label>Condiciones almacenamiento</label><textarea value={form.condiciones_almacenamiento} onChange={(e) => setForm((p) => ({ ...p, condiciones_almacenamiento: e.target.value }))} /></div>
                <div className="acciones"><button className="boton" type="submit">{modoFormulario === 'crear' ? 'Crear materia prima' : 'Guardar cambios'}</button></div>
              </form>
            </div>
          </div>
        )}

        {detalle && (
          <div className="modal-fondo" onClick={() => setDetalle(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Detalle de materia prima</h3>
              <p><strong>Nombre:</strong> {detalle.nombre}</p>
              <p><strong>Unidad base:</strong> {detalle.unidad_medida_base || detalle.unidad_medida}</p>
              <p><strong>Proveedor:</strong> {detalle.proveedor_nombre || '-'}</p>
              <p><strong>Estado:</strong> {detalle.is_active ? 'activo' : 'inactivo'}</p>
              <p><strong>Descripcion:</strong> {detalle.descripcion || '-'}</p>
              <p><strong>Condiciones de almacenamiento:</strong> {detalle.condiciones_almacenamiento || '-'}</p>
              <div className="acciones"><button className="boton" type="button" onClick={() => setDetalle(null)}>Cerrar</button></div>
            </div>
          </div>
        )}
      </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
