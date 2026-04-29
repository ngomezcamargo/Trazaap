import { BarraLateral } from './BarraLateral';

export function ContenedorApp({ titulo, subtitulo, children }) {
  return (
    <div className="shell">
      <BarraLateral />
      <main className="principal">
        <header className="encabezado">
          <h2>{titulo}</h2>
          {subtitulo ? <p>{subtitulo}</p> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
