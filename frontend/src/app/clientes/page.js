'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { clientesServicio } from '@/servicios/clientes.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { puedeAdministrar, ROLES } from '@/utilidades/roles';

const inicial = {
  nombre_razon_social: '',
  nit_documento: '',
  nombre_contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  estado: 'activo'
};

export default function ClientesPage() {
  const puedeEditar = puedeAdministrar(obtenerUsuario()?.role);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      setClientes(await clientesServicio.listarTodos());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { cargar(); }, []);

  const visibles = useMemo(() => {
    const filtro = busqueda.trim().toLowerCase();
    if (!filtro) return clientes;
    return clientes.filter((cliente) => [
      cliente.nombre_razon_social,
      cliente.nit_documento,
      cliente.nombre_contacto
    ].some((valor) => String(valor || '').toLowerCase().includes(filtro)));
  }, [busqueda, clientes]);

  const cerrar = () => {
    if (guardando) return;
    setAbierto(false);
    setEditando(null);
    setForm(inicial);
    setError('');
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(inicial);
    setError('');
    setMensaje('');
    setAbierto(true);
  };

  const abrirEdicion = (cliente) => {
    setEditando(cliente.id_cliente);
    setForm({
      nombre_razon_social: cliente.nombre_razon_social || '',
      nit_documento: cliente.nit_documento || '',
      nombre_contacto: cliente.nombre_contacto || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      estado: cliente.estado || 'activo'
    });
    setError('');
    setMensaje('');
    setAbierto(true);
  };

  const guardar = async (event) => {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError('');
    try {
      if (editando) await clientesServicio.actualizar(editando, form);
      else await clientesServicio.crear(form);
      const accion = editando ? 'actualizado' : 'creado';
      setAbierto(false);
      setEditando(null);
      setForm(inicial);
      setMensaje(`Cliente ${accion} correctamente.`);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp titulo="Clientes" subtitulo="Receptores comerciales de los despachos, sin cuentas internas del sistema.">
          {(mensaje || (!abierto && error)) && <div className={`alerta ${error ? 'error' : 'ok'} notificacion-formulario`}>{error || mensaje}</div>}
          <section className="tarjeta">
            <div className="seccion-encabezado">
              <div>
                <h3>Directorio de clientes</h3>
                <p className="texto-secundario">{visibles.length} clientes visibles</p>
              </div>
              <div className="acciones acciones-compactas">
                <div className="campo buscador-inventario">
                  <label>Buscar</label>
                  <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre, NIT o contacto" />
                </div>
                {puedeEditar && <button className="boton" type="button" onClick={abrirNuevo}>Agregar cliente</button>}
              </div>
            </div>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Razon social</th><th>NIT / documento</th><th>Contacto</th><th>Telefono</th><th>Correo</th><th>Estado</th>{puedeEditar && <th>Accion</th>}</tr></thead>
                <tbody>
                  {visibles.map((cliente) => (
                    <tr key={cliente.id_cliente}>
                      <td><strong>{cliente.nombre_razon_social}</strong><small className="tabla-subtexto">{cliente.direccion}</small></td>
                      <td>{cliente.nit_documento}</td>
                      <td>{cliente.nombre_contacto}</td>
                      <td>{cliente.telefono}</td>
                      <td>{cliente.email || '-'}</td>
                      <td><span className={`estado ${cliente.estado === 'activo' ? 'aprobado' : 'no_encontrado'}`}>{cliente.estado}</span></td>
                      {puedeEditar && <td><button className="boton secundario" type="button" onClick={() => abrirEdicion(cliente)}>Editar</button></td>}
                    </tr>
                  ))}
                  {!visibles.length && <tr><td colSpan={puedeEditar ? 7 : 6}>No hay clientes para mostrar.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {abierto && (
            <div className="modal-fondo" onClick={cerrar}>
              <div className="modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-encabezado-form">
                  <button className="boton secundario modal-cancelar" type="button" onClick={cerrar} disabled={guardando}>Cancelar</button>
                  <h3>{editando ? 'Actualizar cliente' : 'Agregar cliente'}</h3>
                </div>
                <form onSubmit={guardar}>
                  {error && <div className="alerta error alerta-modal" role="alert">{error}</div>}
                  <div className="grid grid-2">
                    <div className="campo"><label>Razon social</label><input required minLength={2} value={form.nombre_razon_social} onChange={(e) => setForm({ ...form, nombre_razon_social: e.target.value })} /></div>
                    <div className="campo"><label>NIT o documento</label><input required minLength={3} value={form.nit_documento} onChange={(e) => setForm({ ...form, nit_documento: e.target.value })} /></div>
                    <div className="campo"><label>Nombre de contacto</label><input required minLength={2} value={form.nombre_contacto} onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })} /></div>
                    <div className="campo"><label>Telefono</label><input required minLength={7} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
                    <div className="campo"><label>Correo (opcional)</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                    <div className="campo"><label>Estado</label><select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
                  </div>
                  <div className="campo" style={{ marginTop: 14 }}><label>Direccion</label><input required minLength={5} value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
                  <div className="acciones"><button className="boton" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : editando ? 'Actualizar cliente' : 'Agregar cliente'}</button></div>
                </form>
              </div>
            </div>
          )}
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
