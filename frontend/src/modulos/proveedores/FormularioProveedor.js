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

export function FormularioProveedor() {
  const [form, setForm] = useState(initialState);
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
      await proveedoresServicio.crear(form);
      setMessage('Proveedor creado correctamente');
      setForm(initialState);
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
          Guardar proveedor
        </button>
      </div>

      {message && <div className="alerta ok">{message}</div>}
      {error && <div className="alerta error">{error}</div>}
    </form>
  );
}
