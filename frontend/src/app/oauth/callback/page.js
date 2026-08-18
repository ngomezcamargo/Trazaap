'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { guardarSesionOAuth } from '@/utilidades/sesion';

function OAuthCallbackContent() {
  const router = useRouter(); const params = useSearchParams(); const [error, setError] = useState('');
  useEffect(() => { (async () => {
    try {
      const code = params.get('code'); const state = params.get('state');
      const esperado = sessionStorage.getItem('trazaap_oauth_state'); const verifier = sessionStorage.getItem('trazaap_oauth_verifier');
      sessionStorage.removeItem('trazaap_oauth_state'); sessionStorage.removeItem('trazaap_oauth_verifier');
      if (!code || !state || !verifier || state !== esperado) throw new Error('Respuesta OAuth invalida');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const intercambio = await fetch(`${apiUrl}/auth/oauth/exchange`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, code_verifier: verifier }) });
      if (!intercambio.ok) throw new Error('No fue posible completar OAuth');
      const tokens = await intercambio.json();
      const perfilRespuesta = await fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      if (!perfilRespuesta.ok) throw new Error('La identidad OAuth no esta vinculada a Trazaap');
      guardarSesionOAuth(tokens.access_token, await perfilRespuesta.json()); router.replace('/panel');
    } catch (e) { setError(e.message); }
  })(); }, [params, router]);
  return <div className="pantalla-login"><div className="panel-login"><h2>Ingreso OAuth 2.0</h2>{error ? <div className="alerta error">{error}</div> : <p>Validando identidad…</p>}</div></div>;
}

export default function OAuthCallbackPage() {
  return <Suspense fallback={<div className="pantalla-login"><div className="panel-login"><p>Preparando OAuth…</p></div></div>}><OAuthCallbackContent /></Suspense>;
}
