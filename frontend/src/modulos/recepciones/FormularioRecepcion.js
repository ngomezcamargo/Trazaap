'use client';

import { useEffect, useState } from 'react';
import { proveedoresServicio } from '@/servicios/proveedores.servicio';
import { recepcionesServicio } from '@/servicios/recepciones.servicio';

const initialForm = {
  fecha_recepcion: new Date().toISOString(),
  proveedor_id: '',
  materia_prima_id: '',
  cantidad: '',
  unidad_presentacion: '',
  lote_proveedor: '',
  fecha_vencimiento: '',
  temperatura_recepcion: '',
  peso_recibido: '',
  observaciones: '',
  recibido_por: '1',
  estado_recepcion: 'aceptado'
};

export function FormularioRecepcion() {
  const [form, setForm] = useState(initialForm);
  const [proveedores, setProveedores] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [proveedoresData, materiasPrimasData] = await Promise.all([
          proveedoresServicio.listar(),
          recepcionesServicio.listarMateriasPrimas()
        ]);

        setProveedores(proveedoresData);
        setMateriasPrimas(materiasPrimasData);
      } catch (err) {
        setError(err.message);
      }
    }

    loadData();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await recepcionesServicio.crear(form);
      setMessage('Recepcion registrada correctamente');
      setForm({ ...initialForm, fecha_recepcion: new Date().toISOString() });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="tarjeta" onSubmit={handleSubmit}>
      <div className="grid grid-2">
        <div className="campo">
          <label>Proveedor</label>
          <select name="proveedor_id" value={form.proveedor_id} onChange={handleChange} required>
            <option value="">Selecciona proveedor</option>
            {proveedores.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Materia prima</label>
          <select name="materia_prima_id" value={form.materia_prima_id} onChange={handleChange} required>
            <option value="">Selecciona materia prima</option>
            {materiasPrimas.map((material) => (
              <option key={material.id} value={material.id}>
                {material.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Cantidad</label>
          <input name="cantidad" type="number" step="0.01" value={form.cantidad} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Unidad / presentacion</label>
          <input name="unidad_presentacion" value={form.unidad_presentacion} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Lote proveedor</label>
          <input name="lote_proveedor" value={form.lote_proveedor} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Fecha vencimiento</label>
          <input
            name="fecha_vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            onChange={handleChange}
            required
          />
        </div>

        <div className="campo">
          <label>Temperatura recepcion</label>
          <input
            name="temperatura_recepcion"
            type="number"
            step="0.1"
            value={form.temperatura_recepcion}
            onChange={handleChange}
            required
          />
        </div>

        <div className="campo">
          <label>Peso recibido</label>
          <input
            name="peso_recibido"
            type="number"
            step="0.01"
            value={form.peso_recibido}
            onChange={handleChange}
            required
          />
        </div>

        <div className="campo">
          <label>Recibido por (id usuario)</label>
          <input name="recibido_por" value={form.recibido_por} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Estado recepcion</label>
          <select name="estado_recepcion" value={form.estado_recepcion} onChange={handleChange}>
            <option value="aceptado">aceptado</option>
            <option value="rechazado">rechazado</option>
            <option value="retenido">retenido</option>
          </select>
        </div>
      </div>

      <div className="campo" style={{ marginTop: 16 }}>
        <label>Observaciones</label>
        <textarea name="observaciones" value={form.observaciones} onChange={handleChange} />
      </div>

      <div className="acciones">
        <button className="boton" type="submit">
          Guardar recepcion
        </button>
      </div>

      {message && <div className="alerta ok">{message}</div>}
      {error && <div className="alerta error">{error}</div>}
    </form>
  );
}
