'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { limpiarSesion } from '@/utilidades/sesion';

const links = [
  { href: '/panel', label: 'Panel' },
  { href: '/proveedores', label: 'Proveedores' },
  { href: '/proveedores/nuevo', label: 'Nuevo proveedor' },
  { href: '/recepciones/nueva', label: 'Nueva recepcion' },
  { href: '/recepciones/inspeccion', label: 'Nueva inspeccion' },
  { href: '/produccion', label: 'Produccion' },
  { href: '/liberacion', label: 'Liberacion' },
  { href: '/trazabilidad', label: 'Trazabilidad' }
];

export function BarraLateral() {
  const pathname = usePathname();
  const router = useRouter();

  const cerrarSesion = () => {
    limpiarSesion();
    router.replace('/iniciar-sesion');
  };

  return (
    <aside className="barra-lateral">
      <div className="marca">
        <h1>Trazaap</h1>
        <p>Operacion Sprint 2</p>
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
