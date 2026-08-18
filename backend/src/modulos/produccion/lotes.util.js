const PREFIJO_LOTE_RE = /^[A-Z0-9]{2,5}$/;

export function normalizarPrefijoLote(value) {
  return String(value || '').trim().toUpperCase();
}

export function esPrefijoLoteValido(value) {
  return PREFIJO_LOTE_RE.test(normalizarPrefijoLote(value));
}

export function sugerirPrefijoLote(nombre) {
  const palabras = String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!palabras.length) return '';
  if (palabras[0] === 'BAGEL') return 'BG';
  if (palabras.length > 1) return palabras.map((palabra) => palabra[0]).join('').slice(0, 5);

  const palabra = palabras[0];
  const consonantes = palabra.replace(/[AEIOU]/g, '');
  const sugerencia = (consonantes.length >= 2 ? consonantes : palabra).slice(0, 5);
  return sugerencia.length >= 2 ? sugerencia : `${sugerencia}X`.slice(0, 2);
}

export function normalizarFechaProduccion(value) {
  const fecha = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error('La fecha de produccion debe tener formato YYYY-MM-DD.');
  }

  const [year, month, day] = fecha.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(year, month - 1, day));
  if (
    fechaUtc.getUTCFullYear() !== year ||
    fechaUtc.getUTCMonth() !== month - 1 ||
    fechaUtc.getUTCDate() !== day
  ) {
    throw new Error('La fecha de produccion no es valida.');
  }

  return fecha;
}

export function normalizarCodigoFabrica(value) {
  const codigo = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(codigo)) {
    throw new Error('FABRICA_CODIGO debe tener entre 2 y 12 caracteres alfanumericos en mayuscula.');
  }
  return codigo;
}

export function formatearLote(codigoFabrica, fechaFabricacion, fechaVencimiento, consecutivo) {
  const codigo = normalizarCodigoFabrica(codigoFabrica);
  const fabricacion = normalizarFechaProduccion(fechaFabricacion);
  const vencimiento = normalizarFechaProduccion(fechaVencimiento);
  if (vencimiento < fabricacion) throw new Error('La fecha de vencimiento no puede ser anterior a la fabricacion.');
  const numero = Number(consecutivo);
  if (!Number.isInteger(numero) || numero < 1 || numero > 9999) {
    throw new Error('El consecutivo del lote debe estar entre 1 y 9999.');
  }

  return `${codigo}-${fabricacion.replaceAll('-', '')}-${vencimiento.replaceAll('-', '')}-${String(numero).padStart(4, '0')}`;
}

export function calcularFechaVencimiento(fechaProduccion, vidaUtilDias) {
  const fecha = normalizarFechaProduccion(fechaProduccion);
  const dias = Number(vidaUtilDias);
  if (!Number.isInteger(dias) || dias <= 0) {
    throw new Error('La vida util del producto debe ser un numero entero positivo.');
  }

  const [year, month, day] = fecha.split('-').map(Number);
  const vencimiento = new Date(Date.UTC(year, month - 1, day));
  vencimiento.setUTCDate(vencimiento.getUTCDate() + dias);
  return vencimiento.toISOString().slice(0, 10);
}
