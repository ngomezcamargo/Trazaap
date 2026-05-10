export function ordenarValor(value) {
  if (Array.isArray(value)) return value.map(ordenarValor);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (value[key] !== undefined) acc[key] = ordenarValor(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function fechaISO(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function fechaSimple(value) {
  const iso = fechaISO(value);
  return iso ? iso.slice(0, 10) : '';
}

export function texto(value) {
  return value === null || value === undefined ? '' : String(value);
}

export function numero(value) {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isNaN(parsed) ? texto(value) : parsed;
}

export function booleano(value) {
  if (value === null || value === undefined || value === '') return '';
  return Boolean(value);
}

export function serializarEstable(value) {
  return JSON.stringify(ordenarValor(value));
}
