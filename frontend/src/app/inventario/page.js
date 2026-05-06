'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { inventarioServicio } from '@/servicios/inventario.servicio';
import { ROLES } from '@/utilidades/roles';

export default function InventarioPage() {
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    inventarioServicio.listar().then(setItems).catch(() => setItems([]));
  }, []);

  const filtradas = items.filter((item) => {
    const f = busqueda.trim().toLowerCase();
    if (!f) return true;
    return String(item.materia_prima || '').toLowerCase().includes(f);
  });

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp titulo="Inventario" subtitulo="Inventario de insumos de materias primas aceptadas.">
          <div className="tarjeta">
            <div className="campo" style={{ marginBottom: 12 }}>
              <label>Buscar por materia prima</label>
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <table className="tabla">
              <thead>
                <tr><th>Materia prima</th><th>Cantidad disponible</th><th>Unidad de medida</th><th>Ultima actualizacion</th></tr>
              </thead>
              <tbody>
                {filtradas.map((item) => (
                  <tr key={item.id_inventario}>
                    <td>{item.materia_prima}</td>
                    <td>{item.cantidad_disponible}</td>
                    <td>{item.unidad_medida}</td>
                    <td>{new Date(item.fecha_actualizacion).toLocaleString()}</td>
                  </tr>
                ))}
                {!filtradas.length && <tr><td colSpan={4}>Sin registros de inventario</td></tr>}
              </tbody>
            </table>
          </div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
