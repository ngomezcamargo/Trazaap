'use client';

import { useEffect, useState } from 'react';
import { liberacionServicio } from '@/servicios/liberacion.servicio';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { obtenerUsuario } from '@/utilidades/sesion';
import { normalizarRol, ROLES } from '@/utilidades/roles';

const formInicial = {
  responsable_liberacion_usuario_id: '',
  tipo_empaque: '',
  unidades_empacadas: '',
  peso_neto: '',
  fecha_vencimiento: '',
  etiqueta_verificada: false,
  verificacion_envase: false,
  estado_liberacion: 'aprobado',
  motivo_retencion: '',
  motivo_rechazo: '',
  observaciones: ''
};

const validaciones = [
  ['etiqueta_verificada', 'Etiqueta'],
  ['verificacion_envase', 'Verificacion envase']
];

export function FormularioLiberacion({ pendiente, onGuardado, onGuardandoCambio }) {
  const usuario = obtenerUsuario();
  const esOperario = normalizarRol(usuario?.role) === ROLES.OPERARIO;
  const [form, setForm] = useState({
    ...formInicial,
    responsable_liberacion_usuario_id: esOperario ? String(usuario?.id || '') : '',
    unidades_empacadas: pendiente?.unidades_producidas ? String(pendiente.unidades_producidas) : '',
    fecha_vencimiento: pendiente?.fecha_vencimiento_calculada ? String(pendiente.fecha_vencimiento_calculada).slice(0, 10) : ''
  });
  const [operarios, setOperarios] = useState([]);
  const [error, setError] = useState('');
  const [motivosBloqueo, setMotivosBloqueo] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const checksCompletos = validaciones.every(([key]) => form[key]);

  useEffect(() => {
    autenticacionServicio.listarOperarios().then(setOperarios).catch((err) => setError(err.message));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (guardando) return;

    setError('');
    setMotivosBloqueo([]);

    if (!checksCompletos) {
      setError('Debe completar todas las validaciones de liberacion.');
      return;
    }

    setGuardando(true);
    onGuardandoCambio?.(true);

    try {
      const payload = {
        ...form,
        id_manufactura: pendiente.id_manufactura,
        responsable_liberacion_usuario_id: Number(form.responsable_liberacion_usuario_id),
        unidades_empacadas: Number(form.unidades_empacadas),
        peso_neto: Number(form.peso_neto)
      };
      const resultado = await liberacionServicio.crear(payload);
      onGuardado?.(resultado);
    } catch (err) {
      setError(err.message);
      setMotivosBloqueo(Array.isArray(err.motivos) ? err.motivos : []);
    } finally {
      setGuardando(false);
      onGuardandoCambio?.(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h4>Liberacion de producto</h4>
      {guardando && (
        <div className="alerta info alerta-modal" role="status" aria-live="polite">
          Guardando la liberacion y validando las reglas en blockchain...
        </div>
      )}
      {error && <div className="alerta error alerta-modal" role="alert">{error}</div>}
      {motivosBloqueo.length > 0 && (
        <div className="alerta error alerta-modal" role="alert">
          <strong>Motivos informados por el chaincode:</strong>
          <ul>
            {motivosBloqueo.map((motivo) => <li key={motivo}>{motivo}</li>)}
          </ul>
        </div>
      )}
      <div className="grid grid-3">
        <div className="campo"><label>Orden de produccion</label><input value={pendiente.codigo_orden} readOnly /></div>
        <div className="campo"><label>Producto</label><input value={`${pendiente.producto} (${pendiente.tamano_presentacion})`} readOnly /></div>
        <div className="campo"><label>Lote</label><input value={pendiente.lote_producido} readOnly /></div>
        <div className="campo"><label>Unidades producidas</label><input value={pendiente.unidades_producidas} readOnly /></div>
        <div className="campo"><label>Fecha de manufactura</label><input value={String(pendiente.fecha_manufactura).slice(0, 10)} readOnly /></div>
        <div className="campo"><label>Responsable manufactura</label><input value={pendiente.responsable_manufactura || '-'} readOnly /></div>
      </div>

      <h4>Datos de liberacion</h4>
      <div className="grid grid-3">
        <div className="campo"><label>Fecha liberacion</label><input value={new Date().toISOString().slice(0, 10)} readOnly /></div>
        <div className="campo">
          <label>Responsable liberacion</label>
          <select value={form.responsable_liberacion_usuario_id} onChange={(e) => setForm({ ...form, responsable_liberacion_usuario_id: e.target.value })} required>
            <option value="">Selecciona operario</option>
            {operarios.map((u) => <option key={u.id} value={u.id}>{u.email} - {u.role}</option>)}
          </select>
        </div>
        <div className="campo"><label>Tipo de empaque</label><input value={form.tipo_empaque} onChange={(e) => setForm({ ...form, tipo_empaque: e.target.value })} required /></div>
        <div className="campo"><label>Unidades liberadas</label><input type="number" min="1" value={form.unidades_empacadas} onChange={(e) => setForm({ ...form, unidades_empacadas: e.target.value })} required /></div>
        <div className="campo"><label>Peso neto</label><input type="number" min="0.01" step="0.001" value={form.peso_neto} onChange={(e) => setForm({ ...form, peso_neto: e.target.value })} required /></div>
        <div className="campo"><label>Fecha de vcto calculada</label><input type="date" value={form.fecha_vencimiento} readOnly required /><small>Se calcula con la fecha de produccion y la vida util del producto.</small></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 10 }}>
        {validaciones.map(([key, label]) => (
          <label key={key} className="checkline">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <h4>Paso 3 - Decision final</h4>
      <div className="grid grid-2">
        <div className="campo">
          <label>Estado liberacion</label>
          <select value={form.estado_liberacion} onChange={(e) => setForm({ ...form, estado_liberacion: e.target.value })} required>
            <option value="aprobado">aprobado</option>
            <option value="retenido">retenido</option>
            <option value="rechazado">rechazado</option>
          </select>
        </div>
        {form.estado_liberacion === 'retenido' && (
          <div className="campo"><label>Motivo retencion</label><input value={form.motivo_retencion} onChange={(e) => setForm({ ...form, motivo_retencion: e.target.value })} required /></div>
        )}
        {form.estado_liberacion === 'rechazado' && (
          <div className="campo"><label>Motivo rechazo</label><input value={form.motivo_rechazo} onChange={(e) => setForm({ ...form, motivo_rechazo: e.target.value })} required /></div>
        )}
      </div>
      <div className="campo" style={{ marginTop: 8 }}>
        <label>Observaciones</label>
        <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
      </div>

      <div className="acciones">
        <button className="boton" type="submit" disabled={guardando}>
          {guardando ? 'Guardando y validando...' : 'Registrar liberacion'}
        </button>
      </div>
    </form>
  );
}
