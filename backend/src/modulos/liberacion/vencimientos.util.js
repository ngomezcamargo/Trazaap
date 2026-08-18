function fechaSimple(value) {
  const fecha = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Fecha de vencimiento invalida');
  return fecha;
}

export function clasificarVencimiento(fechaVencimiento, fechaActual, diasAlerta) {
  const vencimiento = fechaSimple(fechaVencimiento);
  const hoy = fechaSimple(fechaActual);
  const dias = Number(diasAlerta);
  if (!Number.isInteger(dias) || dias < 0) throw new Error('DIAS_ALERTA_VENCIMIENTO debe ser un entero no negativo');
  if (hoy >= vencimiento) return 'vencido';
  const limite = new Date(`${hoy}T00:00:00.000Z`);
  limite.setUTCDate(limite.getUTCDate() + dias);
  return vencimiento <= limite.toISOString().slice(0, 10) ? 'proximo_vencimiento' : null;
}
