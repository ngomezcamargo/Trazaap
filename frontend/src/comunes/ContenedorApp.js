'use client';

import { BarraLateral } from './BarraLateral';
import { obtenerUsuario } from '@/utilidades/sesion';

export function ContenedorApp({ titulo, subtitulo, children }) {
  const usuario = obtenerUsuario();
  const rolSesion = String(usuario?.role || '').trim() || 'sin rol';
  const identificadorSesion = usuario?.email || usuario?.id || 'sin sesion';

  return (
    <div className="shell">
      <BarraLateral />
      <main className="principal">
        <header className="encabezado">
          <div>
            <h2>{titulo}</h2>
            {subtitulo ? <p>{subtitulo}</p> : null}
          </div>
          <div className="usuario-activo">
            <span>{identificadorSesion}</span>
            <strong>{rolSesion}</strong>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
