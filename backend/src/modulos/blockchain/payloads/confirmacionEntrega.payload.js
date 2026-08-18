import { poolPostgres } from '../../../configuracion/postgresql.js';
import { generarCodigoClienteDespacho } from '../../publico/codigos-acceso.util.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadConfirmacionEntrega(idConfirmacion) {
  const { rows } = await poolPostgres.query(
    `SELECT ce.*, d.codigo_despacho, d.numero_factura
     FROM confirmaciones_entrega ce
     JOIN despachos d ON d.id_despacho = ce.id_despacho
     WHERE ce.id_confirmacion = $1`,
    [idConfirmacion]
  );
  const row = rows[0];
  if (!row) return null;

  return ordenarValor({
    idConfirmacion: String(row.id_confirmacion),
    idDespacho: String(row.id_despacho),
    numeroFactura: texto(row.numero_factura),
    codigoCliente: generarCodigoClienteDespacho(row),
    fechaRecepcion: fechaISO(row.fecha_recepcion),
    actor: texto(row.receptor),
    temperaturaEntregaC: numero(row.temperatura_entrega_c),
    observaciones: texto(row.observaciones)
  });
}
