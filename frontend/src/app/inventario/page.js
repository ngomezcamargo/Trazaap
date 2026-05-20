'use client';

import { useEffect, useState } from 'react';
import { ContenedorApp } from '@/comunes/ContenedorApp';
import { GuardiaRol } from '@/comunes/GuardiaRol';
import { GuardiaSesion } from '@/comunes/GuardiaSesion';
import { inventarioServicio } from '@/servicios/inventario.servicio';
import { ROLES } from '@/utilidades/roles';

export default function InventarioPage() {
  const [items, setItems] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    inventarioServicio.listar().then(setItems).catch(() => setItems([]));
    inventarioServicio.listarMovimientos().then(setMovimientos).catch(() => setMovimientos([]));
  }, []);

  const filtradas = items.filter((item) => {
    const f = busqueda.trim().toLowerCase();
    if (!f) return true;
    return String(item.materia_prima || '').toLowerCase().includes(f);
  });

  const estadoInventario = (cantidad) => {
    const valor = Number(cantidad || 0);
    if (valor <= 0) return { texto: 'Sin stock', clase: 'sin_stock' };
    if (valor <= 10) return { texto: 'Bajo inventario', clase: 'bajo' };
    return { texto: 'Disponible', clase: 'disponible' };
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString();
  };

  const origenMovimiento = (item) => {
    if (item.referencia_tipo === 'recepcion') return item.proveedor || 'Proveedor no registrado';
    if (item.referencia_tipo === 'registro_manufactura') return item.codigo_orden ? `Orden ${item.codigo_orden}` : 'Registro de manufactura';
    if (item.referencia_tipo === 'orden_produccion') return item.codigo_orden ? `Orden ${item.codigo_orden}` : 'Orden de produccion';
    return item.referencia_tipo || '-';
  };

  const detalleMovimiento = (item) => {
    if (item.referencia_tipo === 'recepcion') {
      return `Lote: ${item.lote || '-'}`;
    }
    if (item.referencia_tipo === 'registro_manufactura') {
      return `Lote: ${item.lote || item.lote_producido || '-'}`;
    }
    if (item.referencia_tipo === 'orden_produccion') {
      return item.observaciones || 'Consumo asociado a orden de produccion';
    }
    return item.observaciones || '-';
  };

  return (
    <GuardiaSesion>
      <GuardiaRol permitido={[ROLES.GERENTE]}>
        <ContenedorApp titulo="Inventario" subtitulo="Existencias de materias primas e insumos disponibles en planta.">
          <div className="inventario-vista">
            <div className="tarjeta inventario-panel">
              <div className="inventario-toolbar">
                <div>
                  <h3>Existencias actuales</h3>
                  <p className="texto-secundario">{filtradas.length} registros visibles</p>
                </div>
                <div className="campo buscador-inventario">
                  <label>Buscar materia prima</label>
                  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Harina de trigo" />
                </div>
              </div>

              <table className="tabla">
                <thead>
                  <tr>
                    <th>Materia prima</th>
                    <th>Cantidad disponible</th>
                    <th>Unidad</th>
                    <th>Estado</th>
                    <th>Ultima actualizacion</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((item) => {
                    const estado = estadoInventario(item.cantidad_disponible);
                    return (
                      <tr key={item.id_inventario}>
                        <td><strong>{item.materia_prima}</strong></td>
                        <td className="cantidad-inventario">{Number(item.cantidad_disponible || 0).toLocaleString()}</td>
                        <td>{item.unidad_medida}</td>
                        <td><span className={`estado-inventario ${estado.clase}`}>{estado.texto}</span></td>
                        <td>{formatearFecha(item.fecha_actualizacion)}</td>
                      </tr>
                    );
                  })}
                  {!filtradas.length && <tr><td colSpan={5}>Sin registros de inventario</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="tarjeta inventario-panel" style={{ marginTop: 16 }}>
              <div className="inventario-toolbar">
                <div>
                  <h3>Movimientos recientes</h3>
                  <p className="texto-secundario">Entradas por recepcion y salidas por manufactura.</p>
                </div>
              </div>
              <table className="tabla">
                <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Materia prima</th>
                  <th>Movimiento</th>
                  <th>Cantidad</th>
                  <th>Origen / destino</th>
                  <th>Detalle</th>
                  <th>Responsable</th>
                </tr>
                </thead>
                <tbody>
                  {movimientos.map((item) => (
                    <tr key={item.id}>
                      <td>{formatearFecha(item.creado_en)}</td>
                    <td><strong>{item.materia_prima}</strong></td>
                    <td><span className={`movimiento-badge ${item.tipo_movimiento}`}>{item.tipo_movimiento}</span></td>
                    <td>{Number(item.cantidad || 0).toLocaleString()} {item.unidad_medida}</td>
                    <td>{origenMovimiento(item)}</td>
                    <td className="texto-secundario">{detalleMovimiento(item)}</td>
                    <td>{item.responsable || '-'}</td>
                  </tr>
                ))}
                {!movimientos.length && <tr><td colSpan={7}>Sin movimientos recientes</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </ContenedorApp>
      </GuardiaRol>
    </GuardiaSesion>
  );
}
