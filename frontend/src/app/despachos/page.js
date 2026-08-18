'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { clientesServicio } from '@/servicios/clientes.servicio';
import { despachosServicio } from '@/servicios/despachos.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { puedeOperar, ROLES } from '@/utilidades/roles';

function fechaLocalActual() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formularioInicial() {
  return {
    id_cliente: '',
    numero_factura: '',
    fecha_despacho: fechaLocalActual(),
    conductor: '',
    placa_vehiculo: '',
    temperatura_salida_c: '',
    temperatura_transporte_c: '',
    limpieza_vehiculo: 'cumple',
    documentacion_dotacion: 'cumple',
    canal_distribucion: '',
    observaciones: ''
  };
}

const etiquetasEstado = {
  disponible: 'Disponible',
  despacho_parcial: 'Despachado parcialmente',
  despachado_total: 'Despachado completamente',
  pendiente_validacion_blockchain: 'Pendiente de validacion blockchain',
  despachado: 'Despachado',
  entregado: 'Entregado',
  bloqueado: 'Bloqueado',
  cancelado: 'Cancelado'
};

export default function DespachosPage() {
  const usuario = obtenerUsuario();
  const puedeRegistrar = puedeOperar(usuario?.role);
  const [inventarios, setInventarios] = useState([]);
  const [despachos, setDespachos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(formularioInicial);
  const [cantidades, setCantidades] = useState({});
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const [inventarioRes, despachosRes, clientesRes] = await Promise.all([
        despachosServicio.listarInventario(),
        despachosServicio.listar(),
        clientesServicio.listar()
      ]);
      setInventarios(inventarioRes);
      setDespachos(despachosRes);
      setClientes(clientesRes);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!despachos.some((item) => item.estado_despacho === 'pendiente_validacion_blockchain')) return undefined;
    const intervalo = setInterval(cargar, 5000);
    return () => clearInterval(intervalo);
  }, [despachos]);

  const resumen = useMemo(() => inventarios.reduce((acc, item) => ({
    liberadas: acc.liberadas + Number(item.unidades_liberadas || 0),
    reservadas: acc.reservadas + Number(item.unidades_reservadas || 0),
    despachadas: acc.despachadas + Number(item.unidades_despachadas || 0),
    disponibles: acc.disponibles + Number(item.unidades_disponibles || 0)
  }), { liberadas: 0, reservadas: 0, despachadas: 0, disponibles: 0 }), [inventarios]);

  const cerrar = () => {
    if (guardando) return;
    setAbierto(false);
    setForm(formularioInicial());
    setCantidades({});
    setError('');
  };

  const abrir = () => {
    setForm(formularioInicial());
    setCantidades({});
    setError('');
    setMensaje('');
    setAbierto(true);
  };

  const seleccionar = (id, activo) => {
    setCantidades((actual) => {
      const siguiente = { ...actual };
      if (activo) siguiente[id] = siguiente[id] || '1';
      else delete siguiente[id];
      return siguiente;
    });
  };

  const guardar = async (event) => {
    event.preventDefault();
    if (!form.id_cliente || !form.numero_factura.trim() || !form.fecha_despacho || !form.canal_distribucion.trim()) {
      setError('Completa los datos del cliente, la factura, la fecha y el canal de distribucion.');
      return;
    }
    if (!form.conductor.trim() || !form.placa_vehiculo.trim()
      || form.temperatura_salida_c === '' || form.temperatura_transporte_c === '') {
      setError('Completa las condiciones de transporte antes de registrar el despacho.');
      return;
    }
    const detalles = Object.entries(cantidades).map(([id, cantidad]) => ({
      id_inventario_producto_terminado: Number(id),
      cantidad_despachada: Number(cantidad)
    }));
    if (!detalles.length) {
      setError('Selecciona al menos un lote para el despacho.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const resultado = await despachosServicio.crear({
        ...form,
        id_cliente: Number(form.id_cliente),
        temperatura_salida_c: Number(form.temperatura_salida_c),
        temperatura_transporte_c: Number(form.temperatura_transporte_c),
        detalles
      });
      setAbierto(false);
      setForm(formularioInicial());
      setCantidades({});
      setMensaje(`${resultado.codigo_despacho} fue reservado y se esta validando en blockchain.`);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE, ROLES.OPERARIO]}>
        <ContenedorApp titulo="Despachos" subtitulo="Distribucion parcial de lotes liberados y control de entrega por cliente.">
          {(mensaje || (!abierto && error)) && <div className={`alerta ${error ? 'error' : 'ok'} notificacion-formulario`}>{error || mensaje}</div>}

          <div className="despacho-resumen">
            <div><span>Unidades liberadas</span><strong>{resumen.liberadas.toLocaleString()}</strong></div>
            <div><span>Reservadas en Fabric</span><strong>{resumen.reservadas.toLocaleString()}</strong></div>
            <div><span>Despachadas</span><strong>{resumen.despachadas.toLocaleString()}</strong></div>
            <div><span>Disponibles</span><strong>{resumen.disponibles.toLocaleString()}</strong></div>
          </div>

          <section className="tarjeta">
            <div className="seccion-encabezado">
              <div><h3>Inventario despachable</h3><p className="texto-secundario">Solo lotes liberados con unidades disponibles o temporalmente reservadas.</p></div>
              {puedeRegistrar && <button className="boton" type="button" onClick={abrir} disabled={!inventarios.some((item) => Number(item.unidades_disponibles) > 0)}>Registrar despacho</button>}
            </div>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Lote</th><th>Producto</th><th>Liberadas</th><th>Reservadas</th><th>Despachadas</th><th>Disponibles</th><th>Estado</th><th>Vencimiento</th></tr></thead>
                <tbody>
                  {inventarios.map((item) => (
                    <tr key={item.id_inventario}>
                      <td><strong>{item.lote}</strong><small className="tabla-subtexto">{item.codigo_orden}</small></td>
                      <td>{item.producto}<small className="tabla-subtexto">{item.tamano_presentacion}</small></td>
                      <td>{item.unidades_liberadas}</td><td>{item.unidades_reservadas}</td><td>{item.unidades_despachadas}</td><td><strong>{item.unidades_disponibles}</strong></td>
                      <td><span className={`estado ${item.estado}`}>{etiquetasEstado[item.estado] || item.estado}</span></td>
                      <td>{String(item.fecha_vencimiento || '').slice(0, 10)}</td>
                    </tr>
                  ))}
                  {!inventarios.length && <tr><td colSpan={8}>No hay lotes disponibles para despacho.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tarjeta" style={{ marginTop: 16 }}>
            <h3>Historial de despachos</h3>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Despacho</th><th>Cliente</th><th>Factura</th><th>Lotes y cantidades</th><th>Fecha</th><th>Transporte</th><th>Codigo privado</th><th>Estado</th></tr></thead>
                <tbody>
                  {despachos.map((item) => (
                    <tr key={item.id_despacho}>
                      <td><strong>{item.codigo_despacho}</strong>{item.es_heredado && <small className="tabla-subtexto">Registro heredado</small>}</td>
                      <td>{item.cliente || 'No disponible'}</td>
                      <td>{item.numero_factura}</td>
                      <td>{(item.detalles || []).map((detalle) => <div key={detalle.id_detalle}>{detalle.lote}: {detalle.cantidad_despachada}</div>)}</td>
                      <td>{new Date(item.fecha_despacho).toLocaleString()}</td>
                      <td>{item.conductor || '-'}<small className="tabla-subtexto">{item.placa_vehiculo || '-'}</small></td>
                      <td className="codigo-privado">{item.codigo_cliente || '-'}</td>
                      <td><span className={`estado ${item.estado_despacho}`}>{etiquetasEstado[item.estado_despacho] || item.estado_despacho}</span></td>
                    </tr>
                  ))}
                  {!despachos.length && <tr><td colSpan={8}>Todavia no hay despachos registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {abierto && (
            <div className="modal-fondo" onClick={cerrar}>
              <div className="modal modal-despacho" onClick={(event) => event.stopPropagation()}>
                <div className="modal-encabezado-form">
                  <button className="boton secundario modal-cancelar" type="button" onClick={cerrar} disabled={guardando}>Cancelar</button>
                  <h3>Registrar despacho</h3>
                </div>
                <form onSubmit={guardar} noValidate>
                  {guardando && <div className="alerta info alerta-modal">Reservando unidades y preparando la validacion blockchain...</div>}
                  {error && <div className="alerta error alerta-modal" role="alert">{error}</div>}
                  <h4>Destino comercial</h4>
                  <div className="grid grid-3">
                    <div className="campo"><label>Cliente</label><select required value={form.id_cliente} onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}><option value="">Selecciona cliente</option>{clientes.map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre_razon_social} - {cliente.nit_documento}</option>)}</select></div>
                    <div className="campo"><label>Numero de factura</label><input required value={form.numero_factura} onChange={(e) => setForm({ ...form, numero_factura: e.target.value })} /></div>
                    <div className="campo"><label>Fecha y hora de despacho</label><input type="datetime-local" required value={form.fecha_despacho} onChange={(e) => setForm({ ...form, fecha_despacho: e.target.value })} /></div>
                    <div className="campo"><label>Responsable</label><input value={usuario?.email || '-'} readOnly /></div>
                    <div className="campo"><label>Canal de distribucion</label><input required value={form.canal_distribucion} onChange={(e) => setForm({ ...form, canal_distribucion: e.target.value })} placeholder="Venta directa, distribuidor..." /></div>
                  </div>

                  <h4>Lotes del despacho</h4>
                  <div className="tabla-contenedor selector-lotes">
                    <table className="tabla">
                      <thead><tr><th>Incluir</th><th>Lote</th><th>Producto</th><th>Disponible</th><th>Cantidad</th></tr></thead>
                      <tbody>{inventarios.filter((item) => Number(item.unidades_disponibles) > 0).map((item) => {
                        const activo = Object.hasOwn(cantidades, item.id_inventario);
                        return <tr key={item.id_inventario}>
                          <td><input type="checkbox" checked={activo} onChange={(e) => seleccionar(item.id_inventario, e.target.checked)} /></td>
                          <td>{item.lote}</td><td>{item.producto} ({item.tamano_presentacion})</td><td>{item.unidades_disponibles}</td>
                          <td><input className="entrada-cantidad" type="number" min="1" max={item.unidades_disponibles} disabled={!activo} required={activo} value={cantidades[item.id_inventario] || ''} onChange={(e) => setCantidades({ ...cantidades, [item.id_inventario]: e.target.value })} /></td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>

                  <h4>Condiciones de transporte</h4>
                  <div className="grid grid-3">
                    <div className="campo"><label>Conductor</label><input required minLength={2} value={form.conductor} onChange={(e) => setForm({ ...form, conductor: e.target.value })} /></div>
                    <div className="campo"><label>Placa del vehiculo</label><input required minLength={2} value={form.placa_vehiculo} onChange={(e) => setForm({ ...form, placa_vehiculo: e.target.value.toUpperCase() })} /></div>
                    <div className="campo"><label>Temperatura de salida (C)</label><input type="number" step="0.1" required value={form.temperatura_salida_c} onChange={(e) => setForm({ ...form, temperatura_salida_c: e.target.value })} /></div>
                    <div className="campo"><label>Temperatura de transporte (C)</label><input type="number" step="0.1" required value={form.temperatura_transporte_c} onChange={(e) => setForm({ ...form, temperatura_transporte_c: e.target.value })} /></div>
                    <div className="campo"><label>Limpieza del vehiculo</label><select value={form.limpieza_vehiculo} onChange={(e) => setForm({ ...form, limpieza_vehiculo: e.target.value })}><option value="cumple">Cumple</option><option value="no_cumple">No cumple</option></select></div>
                    <div className="campo"><label>Documentacion y dotacion</label><select value={form.documentacion_dotacion} onChange={(e) => setForm({ ...form, documentacion_dotacion: e.target.value })}><option value="cumple">Cumple</option><option value="no_cumple">No cumple</option></select></div>
                  </div>
                  <div className="campo" style={{ marginTop: 14 }}><label>Observaciones</label><textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
                  <div className="acciones"><button className="boton" type="submit" disabled={guardando}>{guardando ? 'Registrando...' : 'Registrar despacho'}</button></div>
                </form>
              </div>
            </div>
          )}
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
