'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { recepcionesServicio } from '@/servicios/recepciones.servicio';
import { ROLES } from '@/utilidades/roles';

export default function RecepcionesPage() {
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [errorDetalle, setErrorDetalle] = useState('');

  useEffect(() => {
    recepcionesServicio.listar().then(setItems).catch(() => setItems([]));
  }, []);

  const filtradas = items.filter((item) => {
    const f = busqueda.trim().toLowerCase();
    if (!f) return true;
    return [item.proveedor_nombre, item.materia_prima_nombre, item.numero_lote || item.lote_proveedor]
      .join(' ')
      .toLowerCase()
      .includes(f);
  });

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE, ROLES.OPERARIO]}>
      <ContenedorApp titulo="Recepciones" subtitulo="Listado operativo de recepciones registradas.">
        <div className="tarjeta">
          <div className="campo" style={{ marginBottom: 12 }}>
            <label>Buscar por proveedor, materia prima o lote</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <table className="tabla"><thead><tr><th>ID</th><th>Fecha</th><th>Proveedor</th><th>Materia prima</th><th>Cantidad</th><th>Unidad</th><th>Lote</th><th>Estado</th><th>Accion</th></tr></thead><tbody>{filtradas.map((r) => <tr key={r.id}><td>{r.id}</td><td>{new Date(r.fecha_recepcion).toLocaleString()}</td><td>{r.proveedor_nombre}</td><td>{r.materia_prima_nombre}</td><td>{r.cantidad}</td><td>{r.unidad_medida || '-'}</td><td>{r.numero_lote || r.lote_proveedor}</td><td>{r.estado_recepcion}</td><td><button type="button" className="boton secundario" onClick={async () => { setErrorDetalle(''); try { const data = await recepcionesServicio.obtenerDetalle(r.id); setDetalle(data); } catch (err) { setErrorDetalle(err.message); } }}>Ver detalle</button></td></tr>)}</tbody></table>
          {errorDetalle && <div className="alerta error">{errorDetalle}</div>}
        </div>
      </ContenedorApp>
      </GuardiaRol>
      {detalle && (
        <div className="modal-fondo" onClick={() => setDetalle(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-encabezado-fijo">
              <h3>Detalle del lote: {detalle.numero_lote || '-'}</h3>
              <button className="boton secundario" type="button" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
            <div className="grid grid-2">
              <p><strong>Fecha recepcion:</strong> {new Date(detalle.fecha_recepcion).toLocaleString()}</p><p><strong>Proveedor:</strong> {detalle.proveedor}</p>
              <p><strong>Materia prima:</strong> {detalle.materia_prima}</p><p><strong>Cantidad:</strong> {detalle.cantidad}</p>
              <p><strong>Unidad de medida:</strong> {detalle.unidad_medida || '-'}</p>
              <p><strong>Presentacion:</strong> {detalle.presentacion}</p><p><strong>Numero de lote:</strong> {detalle.numero_lote}</p>
              <p><strong>Temperatura:</strong> {detalle.temperatura}</p><p><strong>Fecha vencimiento:</strong> {String(detalle.fecha_vencimiento).slice(0, 10)}</p>
              <p><strong>Recibido por:</strong> {detalle.recibido_por}</p><p><strong>Estado final:</strong> {detalle.estado_recepcion}</p>
            </div>
            <div className="campo" style={{ marginTop: 8 }}><label>Observaciones</label><textarea value={detalle.observaciones || ''} readOnly /></div>
            <h4>Inspeccion de producto</h4>
            <div className="grid grid-2">
              <p><strong>Olor:</strong> {String(detalle.olor)}</p><p><strong>Color:</strong> {String(detalle.color)}</p>
              <p><strong>Textura:</strong> {String(detalle.textura)}</p><p><strong>Estado empaque:</strong> {String(detalle.estado_empaque)}</p>
              <p><strong>Certificado calidad:</strong> {String(detalle.certificado_calidad)}</p><p><strong>Decision:</strong> {detalle.decision_final}</p>
            </div>
            <div className="campo" style={{ marginTop: 8 }}><label>Observaciones producto</label><textarea value={detalle.observaciones_producto || ''} readOnly /></div>
            <h4>Inspeccion de transporte</h4>
            <div className="grid grid-2">
              <p><strong>Condiciones del vehiculo:</strong> {String(detalle.condiciones_vehiculo)}</p>
              <p><strong>Higiene del conductor:</strong> {String(detalle.higiene_conductor)}</p>
            </div>
            <div className="campo" style={{ marginTop: 8 }}><label>Observaciones de transporte</label><textarea value={detalle.observaciones_transporte || ''} readOnly /></div>
          </div>
        </div>
      )}
    </GuardiaSesion>
  );
}
