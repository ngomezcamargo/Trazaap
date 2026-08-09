'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { FormularioLiberacion } from '@/modulos/liberacion/FormularioLiberacion';
import { liberacionServicio } from '@/servicios/liberacion.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { puedeOperar, ROLES } from '@/utilidades/roles';

function badgeEstado(estado) {
  if (estado === 'aprobado') return 'Aprobado';
  if (estado === 'retenido') return 'Retenido';
  if (estado === 'rechazado') return 'Rechazado';
  return estado;
}

export default function LiberacionPage() {
  const usuario = obtenerUsuario();
  const puedeRegistrar = puedeOperar(usuario?.role);
  const [pendientes, setPendientes] = useState([]);
  const [liberaciones, setLiberaciones] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    setError('');
    try {
      const [pendientesRes, liberacionesRes] = await Promise.all([
        liberacionServicio.listarPendientes(),
        liberacionServicio.listar()
      ]);
      setPendientes(pendientesRes);
      setLiberaciones(liberacionesRes);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE, ROLES.OPERARIO]}>
        <ContenedorApp titulo="Liberacion de producto" subtitulo="Control final del producto terminado antes de despacho.">
          {error && <div className="alerta error">{error}</div>}

        {puedeRegistrar && <div className="tarjeta">
          <h3>Productos pendientes de liberacion</h3>
          <table className="tabla">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Producto</th>
                <th>Lote producido</th>
                <th>Unidades</th>
                <th>Fecha manufactura</th>
                <th>Responsable manufactura</th>
                <th>Estado manufactura</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((item) => (
                <tr key={item.id_manufactura}>
                  <td>{item.codigo_orden}</td>
                  <td>{item.producto} ({item.tamano_presentacion})</td>
                  <td>{item.lote_producido}</td>
                  <td>{item.unidades_producidas}</td>
                  <td>{String(item.fecha_manufactura).slice(0, 10)}</td>
                  <td>{item.responsable_manufactura || '-'}</td>
                  <td><span className={`estado ${item.estado_manufactura}`}>{item.estado_manufactura}</span></td>
                  <td><button className="boton secundario" type="button" onClick={() => setSeleccionado(item)}>Liberar producto</button></td>
                </tr>
              ))}
              {!pendientes.length && (
                <tr><td colSpan="8">No hay productos pendientes de liberacion.</td></tr>
              )}
            </tbody>
          </table>
        </div>}

        <div className="tarjeta" style={{ marginTop: 16 }}>
          <h3>Historial de liberaciones</h3>
          <table className="tabla">
            <thead><tr><th>Orden</th><th>Producto</th><th>Lote</th><th>Unidades liberadas</th><th>Factura</th><th>Vehiculo</th><th>Vencimiento</th><th>Responsable</th><th>Estado</th></tr></thead>
            <tbody>
              {liberaciones.map((item) => (
                <tr key={item.id_liberacion}>
                  <td>{item.codigo_orden}</td>
                  <td>{item.producto}</td>
                  <td>{item.lote_producido}</td>
                  <td>{item.unidades_empacadas}</td>
                  <td>{item.numero_factura || '-'}</td>
                  <td>{item.conductor || '-'} / {item.placa_vehiculo || '-'}</td>
                  <td>{String(item.fecha_vencimiento).slice(0, 10)}</td>
                  <td>{item.responsable_liberacion_email || item.responsable_liberacion}</td>
                  <td><span className={`estado ${item.estado_liberacion}`}>{badgeEstado(item.estado_liberacion)}</span></td>
                </tr>
              ))}
              {!liberaciones.length && (
                <tr><td colSpan="9">Todavia no hay liberaciones registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {puedeRegistrar && seleccionado && (
          <div className="modal-fondo" onClick={() => setSeleccionado(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-encabezado-form">
                <button className="boton secundario modal-cancelar" type="button" onClick={() => setSeleccionado(null)}>Cancelar</button>
                <h3>Liberar producto</h3>
              </div>
              <FormularioLiberacion
                pendiente={seleccionado}
                onGuardado={async () => {
                  setSeleccionado(null);
                  await cargar();
                }}
              />
            </div>
          </div>
        )}
      </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
