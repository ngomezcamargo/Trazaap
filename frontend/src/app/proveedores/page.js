'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioProveedor } from '@/modulos/proveedores/FormularioProveedor';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { puedeAdministrar, ROLES } from '@/utilidades/roles';

export default function ProveedoresPage() {
  const usuario = obtenerUsuario();
  const puedeEditar = puedeAdministrar(usuario?.role);
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState({ abierto: false, proveedor: null });

  async function recargarProveedores() {
    setProveedores(await proveedoresServicio.listar());
  }

  useEffect(() => {
    recargarProveedores().catch((err) => {
      setError(err.message);
    });
  }, []);

  const abrirCrear = () => {
    setError('');
    setMessage('');
    setModal({ abierto: true, proveedor: null });
  };

  const abrirEditar = (proveedor) => {
    setError('');
    setMessage('');
    setModal({ abierto: true, proveedor });
  };

  const cerrarModal = () => {
    setModal({ abierto: false, proveedor: null });
    setError('');
  };

  const manejarGuardado = async () => {
    cerrarModal();
    setMessage(modal.proveedor ? 'Proveedor actualizado correctamente.' : 'Proveedor creado correctamente.');
    try {
      await recargarProveedores();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarProveedor = async (proveedor) => {
    const confirmar = window.confirm(`¿Eliminar el proveedor "${proveedor.nombre}"?`);
    if (!confirmar) return;

    setError('');
    setMessage('');
    try {
      await proveedoresServicio.eliminar(proveedor.id);
      setMessage('Proveedor eliminado correctamente.');
      await recargarProveedores();
    } catch (err) {
      setError(err.message);
    }
  };

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
            {puedeEditar && (
              <div className="acciones" style={{ marginTop: 0, marginBottom: 14 }}>
                <button className="boton" type="button" onClick={abrirCrear}>Nuevo proveedor</button>
              </div>
            )}

            {!modal.abierto && error && <div className="alerta error">{error}</div>}
            {!modal.abierto && message && <div className="alerta ok">{message}</div>}

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
                  {puedeEditar && <th>Acciones</th>}
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
                    {puedeEditar && (
                      <td>
                        <div className="acciones" style={{ marginTop: 0 }}>
                          <button className="boton secundario" type="button" onClick={() => abrirEditar(provider)}>Editar</button>
                          <button className="boton secundario" type="button" onClick={() => eliminarProveedor(provider)}>Eliminar</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {puedeEditar && modal.abierto && (
            <div className="modal-fondo" onClick={cerrarModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-encabezado-form">
                  <button className="boton secundario modal-cancelar" type="button" onClick={cerrarModal}>Cancelar</button>
                  <h3>{modal.proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
                </div>
                <FormularioProveedor proveedor={modal.proveedor} onSaved={manejarGuardado} />
              </div>
            </div>
          )}
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
