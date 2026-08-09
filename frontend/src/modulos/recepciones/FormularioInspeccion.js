'use client';

import { useState } from 'react';
import { recepcionesServicio } from '@/servicios/recepciones.servicio';

const initialForm = {
  receptionId: '',
  olor: '',
  color: '',
  textura: '',
  estado_empaque: '',
  certificado_calidad: true,
  inspeccion_vehiculo: true,
  observaciones: '',
  decision_final: 'aceptado',
  inspeccionado_por: '1'
};

export function FormularioInspeccion({ onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const { receptionId, ...payload } = form;
      const guardado = await recepcionesServicio.crearInspeccion(receptionId, payload);
      setMessage('Inspeccion registrada correctamente');
      setForm(initialForm);
      onSaved?.(guardado);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="tarjeta" onSubmit={handleSubmit}>
      <div className="grid grid-2">
        <div className="campo">
          <label>ID recepcion</label>
          <input name="receptionId" value={form.receptionId} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Decision final</label>
          <select name="decision_final" value={form.decision_final} onChange={handleChange}>
            <option value="aceptado">aceptado</option>
            <option value="rechazado">rechazado</option>
            <option value="retenido">retenido</option>
          </select>
        </div>

        <div className="campo">
          <label>Olor</label>
          <input name="olor" value={form.olor} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Color</label>
          <input name="color" value={form.color} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Textura</label>
          <input name="textura" value={form.textura} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Estado empaque</label>
          <input name="estado_empaque" value={form.estado_empaque} onChange={handleChange} required />
        </div>

        <div className="campo">
          <label>Inspeccionado por (id usuario)</label>
          <input name="inspeccionado_por" value={form.inspeccionado_por} onChange={handleChange} required />
        </div>
      </div>

      <div className="campo" style={{ marginTop: 12 }}>
        <label>
          <input
            type="checkbox"
            name="certificado_calidad"
            checked={form.certificado_calidad}
            onChange={handleChange}
          />{' '}
          Certificado de calidad
        </label>
      </div>

      <div className="campo" style={{ marginTop: 8 }}>
        <label>
          <input
            type="checkbox"
            name="inspeccion_vehiculo"
            checked={form.inspeccion_vehiculo}
            onChange={handleChange}
          />{' '}
          Inspeccion de vehiculo
        </label>
      </div>

      <div className="campo" style={{ marginTop: 12 }}>
        <label>Observaciones</label>
        <textarea name="observaciones" value={form.observaciones} onChange={handleChange} />
      </div>

      <div className="acciones">
        <button className="boton" type="submit">
          Guardar inspeccion
        </button>
      </div>

      {message && <div className="alerta ok">{message}</div>}
      {error && <div className="alerta error">{error}</div>}
    </form>
  );
}
