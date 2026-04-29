'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { ROLES } from '@/utilidades/roles';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProveedores() {
      try {
        setProveedores(await proveedoresServicio.listar());
      } catch (err) {
        setError(err.message);
      }
    }

    loadProveedores();
  }, []);

  const proveedoresFiltrados = proveedores.filter((provider) => {
    const filtro = busqueda.trim().toLowerCase();
    if (!filtro) return true;

    return [provider.nombre, provider.nit, provider.nombre_contacto || provider.contacto]
      .join(' ')
      .toLowerCase()
      .includes(filtro);
  });

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp titulo="Proveedores" subtitulo="Consulta y seguimiento basico de proveedores activos.">
          <div className="tarjeta">
            {error && <div className="alerta error">{error}</div>}

          <div className="campo" style={{ marginBottom: 14 }}>
            <label>Buscar por nombre, NIT o contacto</label>
            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Ej: Harinas Andinas" />
          </div>

          <table className="tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Contacto</th>
                <th>Telefono</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.map((provider) => (
                <tr key={provider.id}>
                  <td>{provider.id}</td>
                  <td>{provider.nombre}</td>
                  <td>{provider.nit}</td>
                  <td>{provider.nombre_contacto || provider.contacto}</td>
                  <td>{provider.telefono}</td>
                  <td>
                    <span className="estado">{provider.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
