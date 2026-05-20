'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { limpiarSesion } from '@/utilidades/sesion';
import { esGerente, normalizarRol } from '@/utilidades/roles';
import { obtenerUsuario } from '@/utilidades/sesion';

const linksGerente = [
  { href: '/panel', label: 'Dashboard' },
  { href: '/proveedores', label: 'Proveedores' },
  { href: '/materias-primas', label: 'Materias primas' },
  { href: '/recepciones', label: 'Recepciones' },
  { href: '/produccion', label: 'Produccion' },
  { href: '/liberacion', label: 'Liberacion' },
  { href: '/trazabilidad', label: 'Trazabilidad' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/reportes', label: 'Reportes' }
];

const linksOperario = [
  { href: '/panel', label: 'Dashboard' },
  { href: '/recepciones/nueva', label: 'Recepcion' },
  { href: '/produccion', label: 'Produccion' },
  { href: '/liberacion', label: 'Liberacion' },
  { href: '/trazabilidad', label: 'Trazabilidad' }
];

export function BarraLateral() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = obtenerUsuario();
  const rol = normalizarRol(usuario?.role);
  const links = esGerente(rol) ? linksGerente : linksOperario;

  const cerrarSesion = () => {
    limpiarSesion();
    router.replace('/iniciar-sesion');
  };

  return (
    <aside className="barra-lateral">
      <div className="marca">
        <img className="logo-marca" src="/trazaap-logo.jpeg" alt="Logo Trazaap" />
        <div>
          <h1>Trazaap</h1>
          <p>Trazabilidad alimentaria segura</p>
        </div>
      </div>

      <nav className="menu-lateral">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`link-lateral ${pathname === link.href ? 'activo' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: 22 }}>
        <button className="boton secundario" onClick={cerrarSesion}>
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
