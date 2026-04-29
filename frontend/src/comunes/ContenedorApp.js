import { BarraLateral } from './BarraLateral';
import { obtenerUsuario } from '@/utilidades/sesion';
import { normalizarRol } from '@/utilidades/roles';

export function ContenedorApp({ titulo, subtitulo, children }) {
  const usuario = obtenerUsuario();
  const rol = normalizarRol(usuario?.role);

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
            <span>{usuario?.email || 'sin sesion'}</span>
            <strong>{rol}</strong>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
