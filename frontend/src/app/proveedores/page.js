'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
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

  return (
    <GuardiaSesion>
      <ContenedorApp titulo="Proveedores" subtitulo="Consulta y seguimiento basico de proveedores activos.">
        <div className="tarjeta">
          {error && <div className="alerta error">{error}</div>}

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
              {proveedores.map((provider) => (
                <tr key={provider.id}>
                  <td>{provider.id}</td>
                  <td>{provider.nombre}</td>
                  <td>{provider.nit}</td>
                  <td>{provider.contacto}</td>
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
    </GuardiaSesion>
  );
}
