'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { guardarSesion } from '@/utilidades/sesion';

export function FormularioIngreso() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const aviso = searchParams.get('motivo') === 'inactividad'
    ? 'Sesion cerrada por inactividad. Inicia sesion nuevamente.'
    : '';

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

  const iniciarOAuth = async () => {
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const config = await fetch(`${apiUrl}/auth/oauth/config`).then((response) => response.json());
      if (!config.enabled) throw new Error('OAuth 2.0 no esta habilitado en este ambiente');
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const base64url = (value) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const verifier = base64url(bytes);
      const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
      sessionStorage.setItem('trazaap_oauth_verifier', verifier);
      sessionStorage.setItem('trazaap_oauth_state', state);
      const url = new URL(config.authorizationUrl);
      url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri, scope: config.scope, state, code_challenge: challenge, code_challenge_method: 'S256' });
      window.location.assign(url.toString());
    } catch (err) { setError(err.message); }
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
        <button className="boton secundario" type="button" onClick={iniciarOAuth}>Ingresar con OAuth 2.0</button>
      </div>

      {aviso && !error && <div className="alerta error">{aviso}</div>}
      {error && <div className="alerta error">{error}</div>}
    </form>
  );
}
