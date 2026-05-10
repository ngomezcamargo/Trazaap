'use client';

import { useState } from 'react';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';

const initialState = {
  nombre: '',
  nit: '',
  nombre_contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  certificaciones: '',
  estado: 'activo'
};

function normalizarProveedor(proveedor) {
  return {
    nombre: proveedor?.nombre || '',
    nit: proveedor?.nit || '',
    nombre_contacto: proveedor?.nombre_contacto || proveedor?.contacto || '',
    telefono: proveedor?.telefono || '',
    email: proveedor?.email || '',
    direccion: proveedor?.direccion || '',
    certificaciones: proveedor?.certificaciones || '',
    estado: proveedor?.estado || 'activo'
  };
}

export function FormularioProveedor({ proveedor = null, onSaved }) {
  const modoEditar = Boolean(proveedor?.id);
  const [form, setForm] = useState(() => (modoEditar ? normalizarProveedor(proveedor) : initialState));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const guardado = modoEditar
        ? await proveedoresServicio.actualizar(proveedor.id, form)
        : await proveedoresServicio.crear(form);
      setMessage(modoEditar ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente');
      if (!modoEditar) setForm(initialState);
      if (onSaved) onSaved(guardado);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="tarjeta" onSubmit={handleSubmit}>
      <div className="grid grid-2">
        <div className="campo">
          <label>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={handleChange} required />
        </div>
        <div className="campo">
          <label>NIT</label>
          <input name="nit" value={form.nit} onChange={handleChange} required />
        </div>
        <div className="campo">
          <label>Nombre contacto</label>
          <input name="nombre_contacto" value={form.nombre_contacto} onChange={handleChange} required />
        </div>
        <div className="campo">
          <label>Telefono</label>
          <input name="telefono" value={form.telefono} onChange={handleChange} required />
        </div>
        <div className="campo">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="campo">
          <label>Estado</label>
          <select name="estado" value={form.estado} onChange={handleChange}>
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
          </select>
        </div>
      </div>

      <div className="campo" style={{ marginTop: 16 }}>
        <label>Direccion</label>
        <input name="direccion" value={form.direccion} onChange={handleChange} required />
      </div>

      <div className="campo" style={{ marginTop: 12 }}>
        <label>Certificaciones</label>
        <textarea name="certificaciones" value={form.certificaciones} onChange={handleChange} />
      </div>

      <div className="acciones">
        <button className="boton" type="submit">
          {modoEditar ? 'Guardar cambios' : 'Guardar proveedor'}
        </button>
      </div>

      {message && <div className="alerta ok">{message}</div>}
      {error && <div className="alerta error">{error}</div>}
    </form>
  );
}
