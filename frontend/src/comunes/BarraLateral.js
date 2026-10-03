'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { limpiarSesion } from '@/utilidades/sesion';
import { normalizarRol, ROLES } from '@/utilidades/roles';
import { obtenerUsuario } from '@/utilidades/sesion';

const linksAdministrador = [
  { href: '/panel', label: 'Dashboard' },
  { href: '/proveedores', label: 'Proveedores' },
  { href: '/materias-primas', label: 'Materias primas' },
  { href: '/recepciones', label: 'Recepciones' },
  { href: '/produccion', label: 'Produccion' },
  { href: '/documentos', label: 'Documentos' },
  { href: '/almacenamiento', label: 'Almacenamiento' },
  { href: '/liberacion', label: 'Liberacion' },
  { href: '/despachos', label: 'Despachos' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/trazabilidad', label: 'Trazabilidad' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/usuarios', label: 'Usuarios' }
];

const linksGerente = [
  { href: '/panel', label: 'Dashboard' },
  { href: '/proveedores', label: 'Proveedores' },
  { href: '/materias-primas', label: 'Materias primas' },
  { href: '/recepciones', label: 'Recepciones' },
  { href: '/produccion', label: 'Produccion' },
  { href: '/documentos', label: 'Documentos' },
  { href: '/almacenamiento', label: 'Almacenamiento' },
  { href: '/liberacion', label: 'Liberacion' },
  { href: '/despachos', label: 'Despachos' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/trazabilidad', label: 'Trazabilidad' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/usuarios', label: 'Usuarios' }
];

const linksOperario = [
  { href: '/panel', label: 'Dashboard' },
  { href: '/materias-primas', label: 'Materias primas' },
  { href: '/recepciones', label: 'Recepciones' },
  { href: '/recepciones/nueva', label: 'Nueva recepcion' },
  { href: '/produccion', label: 'Produccion' },
  { href: '/almacenamiento', label: 'Almacenamiento' },
  { href: '/liberacion', label: 'Liberacion' },
  { href: '/despachos', label: 'Despachos' },
  { href: '/trazabilidad', label: 'Trazabilidad' }
];

export function BarraLateral() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = obtenerUsuario();
  const rol = normalizarRol(usuario?.role);
  const links = rol === ROLES.ADMINISTRADOR
    ? linksAdministrador
    : rol === ROLES.GERENTE
      ? linksGerente
      : linksOperario;

  const cerrarSesion = () => {
    limpiarSesion();
    router.replace('/iniciar-sesion');
  };

  return (
    <aside className="barra-lateral">
      <div className="marca">
        <Image className="logo-marca" src="/trazaap-logo.jpeg" alt="Logo Trazaap" width={56} height={56} priority />
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
