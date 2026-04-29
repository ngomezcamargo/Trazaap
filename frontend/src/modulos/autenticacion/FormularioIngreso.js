'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { guardarSesion } from '@/utilidades/sesion';

export function FormularioIngreso() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await autenticacionServicio.iniciarSesion(form);
      guardarSesion(response.token, response.user);
      router.replace('/panel');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="tarjeta" onSubmit={handleSubmit}>
      <div className="grid">
        <div className="campo">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="campo">
          <label>Contrasena</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="acciones">
        <button className="boton" type="submit">
          Iniciar sesion
        </button>
      </div>

      {error && <div className="alerta error">{error}</div>}
    </form>
  );
}
