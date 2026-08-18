import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadControlAlmacenamiento(idControl) {
  const { rows } = await poolPostgres.query(
    `SELECT ca.*, al.lote_producido, al.temperatura_min_esperada_c,
            al.temperatura_max_esperada_c, op.codigo_orden, opp.producto,
            u.email AS responsable_control_email
     FROM controles_almacenamiento ca
     JOIN almacenamientos_lote al ON al.id_almacenamiento = ca.id_almacenamiento
     JOIN ordenes_produccion op ON op.id = al.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = al.id_producto
     LEFT JOIN users u ON u.id = ca.responsable_control
     WHERE ca.id_control = $1`,
    [idControl]
  );
  const row = rows[0];
  if (!row) return null;
  const payload = {
    tipoEvento: 'control_almacenamiento',
    control: {
      codigo_orden: texto(row.codigo_orden),
      producto: texto(row.producto),
      lote_producido: texto(row.lote_producido),
      fecha_control: fechaISO(row.fecha_control),
      temperatura_c: numero(row.temperatura_c),
      temperatura_min_esperada_c: numero(row.temperatura_min_esperada_c),
      temperatura_max_esperada_c: numero(row.temperatura_max_esperada_c),
      condicion_general: texto(row.condicion_general),
      resultado: texto(row.resultado),
      observaciones: texto(row.observaciones),
      responsable_control: texto(row.responsable_control_email)
    }
  };
  return {
    tipoEvento: 'control_almacenamiento',
    idEntidad: idControl,
    lote: texto(row.lote_producido),
    actor: texto(row.responsable_control_email || 'sistema'),
    fechaEvento: fechaISO(row.fecha_control),
    payload: ordenarValor(payload)
  };
}

