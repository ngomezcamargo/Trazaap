'use client';

import { useEffect, useState } from 'react';
import { materiasPrimasServicio } from '@/servicios/materias-primas.servicio';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { recepcionesServicio } from '@/servicios/recepciones.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';

const nuevoFormulario = (usuario) => ({
  proveedor_id: '',
  materia_prima_id: '',
  cantidad: '',
  unidad_medida: '',
  presentacion: 'bulto',
  numero_lote: '',
  temperatura: '',
  fecha_vencimiento: '',
  observaciones: '',
  recibido_por: usuario?.id || '',
  estado_recepcion: 'aceptado',
  inspeccion_producto: {
    olor: false,
    color: false,
    textura: false,
    estado_empaque: false,
    certificado_calidad: false,
    observaciones_producto: '',
    decision_producto: ''
  },
  inspeccion_transporte: {
    condiciones_vehiculo: '',
    higiene_conductor: '',
    observaciones_transporte: ''
  }
});

const opcionesCumplimiento = [
  { value: '', label: 'Selecciona una opcion' },
  { value: 'true', label: 'Cumple' },
  { value: 'false', label: 'No cumple' }
];

const itemsProducto = [
  ['olor', 'Olor conforme'],
  ['color', 'Color conforme'],
  ['textura', 'Textura conforme'],
  ['estado_empaque', 'Empaque en buen estado'],
  ['certificado_calidad', 'Certificado de calidad recibido']
];

export function FormularioRecepcion() {
  const usuario = obtenerUsuario();
  const [form, setForm] = useState(() => nuevoFormulario(usuario));
  const [proveedores, setProveedores] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([proveedoresServicio.listar(), materiasPrimasServicio.listar()])
      .then(([proveedoresData, materiasPrimasData]) => {
        setProveedores(proveedoresData);
        setMateriasPrimas(materiasPrimasData.filter((item) => item.is_active));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const materiaPrima = materiasPrimas.find((item) => String(item.id) === String(form.materia_prima_id));
    if (!materiaPrima) return;

    const unidadBase = materiaPrima.unidad_medida_base || materiaPrima.unidad_medida || 'unidad';
    setForm((prev) => {
      if (prev.unidad_medida === unidadBase) return prev;
      return { ...prev, unidad_medida: unidadBase };
    });
  }, [form.materia_prima_id, materiasPrimas]);

  const actualizarInspeccionProducto = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      inspeccion_producto: {
        ...prev.inspeccion_producto,
        [campo]: valor
      }
    }));
  };

  const actualizarInspeccionTransporte = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      inspeccion_transporte: {
        ...prev.inspeccion_transporte,
        [campo]: valor
      }
    }));
  };

  const validarFormulario = () => {
    if (!form.inspeccion_producto.decision_producto) {
      return 'Debe seleccionar una decision para la inspeccion del producto.';
    }

    if (form.inspeccion_transporte.condiciones_vehiculo === '') {
      return 'Debe validar las condiciones del vehiculo.';
    }

    if (form.inspeccion_transporte.higiene_conductor === '') {
      return 'Debe validar la higiene del conductor.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    const payload = {
      ...form,
      fecha_recepcion: new Date().toISOString(),
      recibido_por: usuario?.id,
      inspeccion_transporte: {
        condiciones_vehiculo: form.inspeccion_transporte.condiciones_vehiculo === 'true',
        higiene_conductor: form.inspeccion_transporte.higiene_conductor === 'true',
        observaciones_transporte: form.inspeccion_transporte.observaciones_transporte
      }
    };

    try {
      await recepcionesServicio.crear(payload);
      setMessage('Recepcion registrada correctamente');
      setForm(nuevoFormulario(usuario));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="tarjeta" onSubmit={handleSubmit}>
      <div className="grid grid-2">
        <div className="campo"><label>Fecha recepcion</label><input value={new Date().toLocaleString()} disabled /></div>
        <div className="campo"><label>Recibido por</label><input value={usuario?.email || usuario?.id || '-'} disabled /></div>
        <div className="campo"><label>Proveedor</label><select value={form.proveedor_id} onChange={(e) => setForm((p) => ({ ...p, proveedor_id: e.target.value }))} required><option value="">Selecciona proveedor</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
        <div className="campo"><label>Materia prima</label><select value={form.materia_prima_id} onChange={(e) => setForm((p) => ({ ...p, materia_prima_id: e.target.value }))} required><option value="">Selecciona materia prima</option>{materiasPrimas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
        <div className="campo"><label>Cantidad</label><input type="number" step="0.01" value={form.cantidad} onChange={(e) => setForm((p) => ({ ...p, cantidad: e.target.value }))} required /></div>
        <div className="campo"><label>Unidad de medida</label><input value={form.unidad_medida} readOnly /></div>
        <div className="campo"><label>Presentacion</label><select value={form.presentacion} onChange={(e) => setForm((p) => ({ ...p, presentacion: e.target.value }))}><option value="bulto">Bulto</option><option value="caja">Caja</option><option value="unidad">Unidad</option><option value="otro">Otro</option></select></div>
        <div className="campo"><label>Numero lote</label><input value={form.numero_lote} onChange={(e) => setForm((p) => ({ ...p, numero_lote: e.target.value }))} required /></div>
        <div className="campo"><label>Temperatura</label><input type="number" step="0.1" value={form.temperatura} onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))} required /></div>
        <div className="campo"><label>Fecha vencimiento</label><input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm((p) => ({ ...p, fecha_vencimiento: e.target.value }))} required /></div>
        <div className="campo"><label>Estado final</label><select value={form.estado_recepcion} onChange={(e) => setForm((p) => ({ ...p, estado_recepcion: e.target.value }))}><option value="aceptado">aceptado</option><option value="rechazado">rechazado</option><option value="retenido">retenido</option></select></div>
      </div>

      <div className="campo" style={{ marginTop: 12 }}><label>Observaciones generales</label><textarea value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} /></div>

      <section className="seccion-formulario" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Inspeccion de producto</h3>
        <div className="grid grid-2">
          {itemsProducto.map(([campo, etiqueta]) => (
            <label key={campo}>
              <input type="checkbox" checked={form.inspeccion_producto[campo]} onChange={(e) => actualizarInspeccionProducto(campo, e.target.checked)} /> {etiqueta}
            </label>
          ))}
          <div className="campo">
            <label>Decision producto</label>
            <select value={form.inspeccion_producto.decision_producto} onChange={(e) => actualizarInspeccionProducto('decision_producto', e.target.value)} required>
              <option value="">Selecciona una decision</option>
              <option value="aceptado">aceptado</option>
              <option value="rechazado">rechazado</option>
              <option value="retenido">retenido</option>
            </select>
          </div>
        </div>
        <div className="campo" style={{ marginTop: 12 }}>
          <label>Observaciones inspeccion de producto</label>
          <textarea value={form.inspeccion_producto.observaciones_producto} onChange={(e) => actualizarInspeccionProducto('observaciones_producto', e.target.value)} />
        </div>
      </section>

      <section className="seccion-formulario" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Inspeccion de transporte</h3>
        <div className="grid grid-2">
          <div className="campo">
            <label>Condiciones del vehiculo</label>
            <select value={form.inspeccion_transporte.condiciones_vehiculo} onChange={(e) => actualizarInspeccionTransporte('condiciones_vehiculo', e.target.value)} required>
              {opcionesCumplimiento.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Higiene del conductor</label>
            <select value={form.inspeccion_transporte.higiene_conductor} onChange={(e) => actualizarInspeccionTransporte('higiene_conductor', e.target.value)} required>
              {opcionesCumplimiento.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
            </select>
          </div>
        </div>
        <div className="campo" style={{ marginTop: 12 }}>
          <label>Observaciones de transporte</label>
          <textarea value={form.inspeccion_transporte.observaciones_transporte} onChange={(e) => actualizarInspeccionTransporte('observaciones_transporte', e.target.value)} />
        </div>
      </section>

      <div className="acciones">
        <button className="boton" type="submit">Guardar recepcion</button>
      </div>

      {message && <div className="alerta ok">{message}</div>}
      {error && <div className="alerta error">{error}</div>}
    </form>
  );
}
