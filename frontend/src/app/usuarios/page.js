'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { ROLES } from '@/utilidades/roles';

const inicial = { email: '', role: 'operario', password: '', is_active: true };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try { setUsuarios(await usuariosServicio.listar()); } catch (err) { setError(err.message); }
  };
  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => { setEditando(null); setForm(inicial); setError(''); setAbierto(true); };
  const abrirEdicion = (usuario) => {
    setEditando(usuario.id);
    setForm({ email: usuario.email, role: usuario.role, is_active: usuario.is_active, password: '' });
    setError(''); setAbierto(true);
  };
  const cerrar = () => { if (!guardando) { setAbierto(false); setError(''); } };
  const guardar = async (event) => {
    event.preventDefault(); setGuardando(true); setError(''); setMensaje('');
    try {
      if (editando) await usuariosServicio.actualizar(editando, form);
      else await usuariosServicio.crear(form);
      setMensaje(`Usuario ${editando ? 'actualizado' : 'creado'} correctamente.`);
      setAbierto(false); setForm(inicial); setEditando(null); await cargar();
    } catch (err) { setError(err.message); } finally { setGuardando(false); }
  };

  return <GuardiaSesion><GuardiaRol permitido={[ROLES.GERENTE]}>
    <ContenedorApp titulo="Administracion de usuarios" subtitulo="Cuentas internas y roles RBAC de Trazaap.">
      {(mensaje || (!abierto && error)) && <div className={`alerta ${error ? 'error' : 'ok'}`}>{error || mensaje}</div>}
      <section className="tarjeta">
        <div className="seccion-encabezado"><div><h3>Usuarios internos</h3><p className="texto-secundario">Administrador, gerente y operario</p></div><button className="boton" onClick={abrirNuevo}>Crear usuario</button></div>
        <div className="tabla-contenedor"><table className="tabla"><thead><tr><th>Correo</th><th>Rol</th><th>Estado</th><th>Actualizado</th><th>Accion</th></tr></thead><tbody>
          {usuarios.map((usuario) => <tr key={usuario.id}><td>{usuario.email}</td><td>{usuario.role}</td><td><span className={`estado ${usuario.is_active ? 'aprobado' : 'no_encontrado'}`}>{usuario.is_active ? 'activo' : 'inactivo'}</span></td><td>{new Date(usuario.updated_at).toLocaleString()}</td><td><button className="boton secundario" onClick={() => abrirEdicion(usuario)}>Editar</button></td></tr>)}
          {!usuarios.length && <tr><td colSpan="5">No hay usuarios para mostrar.</td></tr>}
        </tbody></table></div>
      </section>
      {abierto && <div className="modal-fondo" onClick={cerrar}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-encabezado-form"><button className="boton secundario modal-cancelar" onClick={cerrar}>Cancelar</button><h3>{editando ? 'Editar usuario' : 'Crear usuario'}</h3></div>
        <form onSubmit={guardar}>{error && <div className="alerta error" role="alert">{error}</div>}<div className="grid grid-2">
          <div className="campo"><label>Correo</label><input type="email" required maxLength="120" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}/></div>
          <div className="campo"><label>Rol</label><select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}><option value="operario">Operario</option><option value="gerente">Gerente</option><option value="administrador">Administrador</option></select></div>
          <div className="campo"><label>{editando ? 'Nueva contrasena (opcional)' : 'Contrasena'}</label><input type="password" required={!editando} minLength="10" maxLength="128" autoComplete="new-password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})}/><small>Minimo 10 caracteres, mayuscula, minuscula y numero.</small></div>
          {editando && <div className="campo"><label>Estado</label><select value={String(form.is_active)} onChange={(e) => setForm({...form, is_active: e.target.value === 'true'})}><option value="true">Activo</option><option value="false">Inactivo</option></select></div>}
        </div><div className="acciones"><button className="boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button></div></form>
      </div></div>}
    </ContenedorApp>
  </GuardiaRol></GuardiaSesion>;
}
