'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { liberacionServicio } from '@/servicios/liberacion.servicio';
import { materiasPrimasServicio } from '@/servicios/materias-primas.servicio';
import { produccionServicio } from '@/servicios/produccion.servicio';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { recepcionesServicio } from '@/servicios/recepciones.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { esGerente, normalizarRol } from '@/utilidades/roles';

function TarjetaIndicador({ titulo, valor, estado }) {
  return (
    <div className="tarjeta indicador">
      <span>{titulo}</span>
      <strong>{valor}</strong>
      {estado ? <span className={`estado ${estado}`}>{estado}</span> : null}
    </div>
  );
}

export default function PanelPage() {
  const usuario = obtenerUsuario();
  const rol = normalizarRol(usuario?.role);
  const [proveedores, setProveedores] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [liberaciones, setLiberaciones] = useState([]);
  const [alertasVencimiento, setAlertasVencimiento] = useState([]);

  useEffect(() => {
    Promise.all([
      proveedoresServicio.listar().catch(() => []),
      materiasPrimasServicio.listar().catch(() => []),
      recepcionesServicio.listar().catch(() => []),
      produccionServicio.listarOrdenes().catch(() => []),
      liberacionServicio.listar().catch(() => []),
      liberacionServicio.listarAlertasVencimiento().catch(() => [])
    ]).then(([prov, mats, recs, ords, libs, alertas]) => {
      setProveedores(prov);
      setMaterias(mats);
      setRecepciones(recs);
      setOrdenes(ords);
      setLiberaciones(libs);
      setAlertasVencimiento(alertas);
    });
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const recepcionesHoy = useMemo(
    () => recepciones.filter((r) => String(r.fecha_recepcion || '').slice(0, 10) === hoy).length,
    [hoy, recepciones]
  );
  const retenidos = useMemo(
    () => recepciones.filter((r) => ['retenido', 'rechazado'].includes(r.estado_recepcion)).length,
    [recepciones]
  );
  const registrosOperativosHoy = useMemo(() => recepcionesHoy + ordenes.length + liberaciones.length, [recepcionesHoy, ordenes.length, liberaciones.length]);

  const gerente = esGerente(rol);

  return (
    <GuardiaSesion>
      <ContenedorApp
        titulo={gerente ? 'Dashboard gerencial' : 'Dashboard operativo'}
        subtitulo={
          gerente
            ? `Seguimiento diario de planta. Bienvenido, ${usuario?.email || 'gerente'}.`
            : `Panel operativo de trazabilidad. Bienvenido, ${usuario?.email || 'operario'}.`
        }
      >
        {gerente ? (
          <>
            <div className="grid grid-5">
              <TarjetaIndicador titulo="Total proveedores" valor={proveedores.length} />
              <TarjetaIndicador titulo="Insumos registrados" valor={materias.length} />
              <TarjetaIndicador titulo="Recepciones del dia" valor={recepcionesHoy} />
              <TarjetaIndicador titulo="Lotes en proceso" valor={ordenes.length} estado="en_proceso" />
              <TarjetaIndicador titulo="Retenidos/Rechazados" valor={retenidos} estado={retenidos > 0 ? 'retenido' : 'aceptado'} />
              <TarjetaIndicador titulo="Vencidos sin despacho" valor={alertasVencimiento.length} estado={alertasVencimiento.length > 0 ? 'rechazado' : 'aceptado'} />
            </div>

            {alertasVencimiento.length > 0 && (
              <div className="tarjeta" style={{ marginTop: 16 }}>
                <h3>Alertas de vencimiento sin despacho</h3>
                <table className="tabla">
                  <thead><tr><th>Producto</th><th>Lote</th><th>Vencimiento</th><th>Unidades disponibles</th><th>Estado</th></tr></thead>
                  <tbody>
                    {alertasVencimiento.map((alerta) => (
                      <tr key={alerta.id_inventario}>
                        <td>{alerta.producto}</td>
                        <td>{alerta.lote}</td>
                        <td>{String(alerta.fecha_vencimiento).slice(0, 10)}</td>
                        <td>{alerta.unidades_disponibles}</td>
                        <td><span className="estado rechazado">Vencido sin despacho</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <div className="tarjeta">
                <h3>Recepciones recientes</h3>
                <table className="tabla">
                  <thead><tr><th>Fecha</th><th>Proveedor</th><th>Lote</th><th>Estado</th></tr></thead>
                  <tbody>
                    {recepciones.slice(-5).map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.fecha_recepcion).toLocaleString()}</td>
                        <td>{r.proveedor_nombre}</td>
                        <td>{r.numero_lote || r.lote_proveedor}</td>
                        <td><span className={`estado ${r.estado_recepcion}`}>{r.estado_recepcion}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tarjeta">
                <h3>Alertas de calidad</h3>
                <ul className="lista-resumen">
                  <li>Lotes retenidos/rechazados: <strong>{retenidos}</strong></li>
                  <li>Lotes pendientes por liberar: <strong>{Math.max(ordenes.length - liberaciones.length, 0)}</strong></li>
                  <li>Ordenes de produccion del dia: <strong>{ordenes.length}</strong></li>
                </ul>
                <div className="acciones" style={{ marginTop: 12 }}>
                  <Link href="/trazabilidad" className="boton">Ir a trazabilidad</Link>
                </div>
              </div>
            </div>

            <div className="tarjeta" style={{ marginTop: 16 }}>
              <h3>Accesos rapidos</h3>
              <div className="grid grid-4">
                <Link className="acceso-rapido" href="/proveedores">Proveedores</Link>
                <Link className="acceso-rapido" href="/materias-primas">Materias primas</Link>
                <Link className="acceso-rapido" href="/recepciones">Recepciones</Link>
                <Link className="acceso-rapido" href="/reportes">Reportes futuros</Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="tarjeta" style={{ marginBottom: 16 }}>
              <h3>Panel operativo de trazabilidad</h3>
              <p>Acciones rapidas para registrar informacion del proceso en planta.</p>
              <div className="estado aceptado" style={{ marginTop: 8 }}>Registros del dia: {registrosOperativosHoy}</div>
            </div>
            <div className="grid grid-3">
              <Link className="tarjeta tarea" href="/recepciones/nueva"><h3>Registrar recepcion</h3><p>Incluye inspeccion de producto y vehiculo.</p></Link>
              <Link className="tarjeta tarea" href="/produccion"><h3>Registrar produccion</h3><p>Ordenes y tiempos de proceso.</p></Link>
              <Link className="tarjeta tarea" href="/liberacion"><h3>Registrar liberacion</h3><p>Salida de producto terminado.</p></Link>
              <Link className="tarjeta tarea" href="/trazabilidad"><h3>Consultar trazabilidad basica</h3><p>Busqueda de lotes para validacion operativa.</p></Link>
            </div>
            <div className="tarjeta" style={{ marginTop: 16 }}>
              <h3>Flujo operativo</h3>
              <div className="flujo">Recepcion <span>{'->'}</span> Produccion <span>{'->'}</span> Liberacion <span>{'->'}</span> Trazabilidad</div>
            </div>
          </>
        )}
      </ContenedorApp>
    </GuardiaSesion>
  );
}
