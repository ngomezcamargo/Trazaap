import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadDevolucion(idCaso) {
  const { rows } = await poolPostgres.query(`
    SELECT dnc.*, c.nit_documento AS cliente_documento, d.codigo_despacho,
           u.email AS responsable_email
    FROM devoluciones_no_conformidades dnc
    LEFT JOIN clientes c ON c.id_cliente = dnc.id_cliente
    LEFT JOIN despachos d ON d.id_despacho = dnc.id_despacho
    JOIN users u ON u.id = dnc.responsable
    WHERE dnc.id_caso = $1`, [idCaso]);
  const row = rows[0];
  if (!row) return null;
  return {
    tipoEvento: 'devolucion_no_conformidad', idEntidad: idCaso, lote: texto(row.lote),
    actor: texto(row.responsable_email), fechaEvento: fechaISO(row.fecha_registro),
    payload: ordenarValor({
      tipo_caso: texto(row.tipo_caso), lote: texto(row.lote),
      cliente_documento: texto(row.cliente_documento), codigo_despacho: texto(row.codigo_despacho),
      cantidad: numero(row.cantidad), fecha_registro: fechaISO(row.fecha_registro),
      motivo: texto(row.motivo), accion: texto(row.accion),
      fecha_decision: fechaISO(row.fecha_decision), responsable: texto(row.responsable_email),
      observaciones: texto(row.observaciones), impacto_inventario: texto(row.impacto_inventario)
    })
  };
}
