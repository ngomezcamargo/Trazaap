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
      <GuardiaRol permitido={[ROLES.GERENTE]}>
      <ContenedorApp titulo="Recepciones" subtitulo="Listado operativo de recepciones registradas.">
        <div className="tarjeta">
          <div className="campo" style={{ marginBottom: 12 }}>
            <label>Buscar por proveedor, materia prima o lote</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <table className="tabla"><thead><tr><th>ID</th><th>Fecha</th><th>Proveedor</th><th>Materia prima</th><th>Cantidad</th><th>Lote</th><th>Estado</th></tr></thead><tbody>{filtradas.map((r) => <tr key={r.id}><td>{r.id}</td><td>{new Date(r.fecha_recepcion).toLocaleString()}</td><td>{r.proveedor_nombre}</td><td>{r.materia_prima_nombre}</td><td>{r.cantidad}</td><td>{r.numero_lote || r.lote_proveedor}</td><td>{r.estado_recepcion}</td></tr>)}</tbody></table>
        </div>
      </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
