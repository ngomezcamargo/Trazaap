import { createHash } from 'node:crypto';

export function normalizarCodigo(valor) {
  return String(valor || '').trim().toUpperCase();
}

function limpiarCodigoLote(lote) {
  return normalizarCodigo(lote).replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'LOTE';
}

function generarCodigo(prefijo, lote, partes = []) {
  const base = [prefijo, lote, ...partes].map((item) => String(item || '')).join('|');
  const hash = createHash('sha256').update(base).digest('hex').slice(0, 10).toUpperCase();
  return `${prefijo}-${limpiarCodigoLote(lote)}-${hash}`;
}

export function generarCodigoCliente({ lote, numeroFactura, idLiberacion }) {
  return generarCodigo('CLI', lote, [numeroFactura, idLiberacion]);
}

export function generarCodigosAcceso(data) {
  const lote = data.lote || data.loteConsultado;
  const liberacion = data.liberacion || {};
  const orden = data.produccion?.orden || {};
  const manufactura = data.produccion?.manufactura || {};

  return {
    cliente: generarCodigoCliente({
      lote,
      numeroFactura: liberacion.numero_factura,
      idLiberacion: liberacion.id_liberacion
    }),
    auditoria: generarCodigo('AUD', lote, [orden.id, manufactura.id_manufactura, liberacion.id_liberacion])
  };
}
