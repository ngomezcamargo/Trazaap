import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadManufactura(idManufactura) {
  const { rows } = await poolPostgres.query(
    `SELECT
       rm.*,
       op.codigo_orden,
       opp.producto,
       opp.tamano_presentacion,
       u.email AS registrado_por_usuario_email
     FROM registro_manufactura rm
     JOIN ordenes_produccion op ON op.id = rm.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
     LEFT JOIN users u ON u.id = rm.registrado_por_usuario_id
     WHERE rm.id_manufactura = $1`,
    [idManufactura]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'registro_manufactura',
    manufactura: {
      codigo_orden: texto(row.codigo_orden),
      producto: texto(row.producto),
      tamano_presentacion: texto(row.tamano_presentacion),
      lote_producido: texto(row.lote_producido),
      unidades_producidas: numero(row.unidades_producidas),
      tiempo_real_fermentacion_minutos: numero(row.tiempo_real_fermentacion_minutos),
      temperatura_real_fermentacion_c: numero(row.temperatura_real_fermentacion_c),
      tiempo_real_horneado_minutos: numero(row.tiempo_real_horneado_minutos),
      temperatura_real_horneado_c: numero(row.temperatura_real_horneado_c),
      tiempo_real_inmersion_minutos: numero(row.tiempo_real_inmersion_minutos),
      temperatura_real_inmersion_c: numero(row.temperatura_real_inmersion_c),
      hora_inicio: texto(row.hora_inicio),
      hora_fin: texto(row.hora_fin),
      registrado_por: texto(row.registrado_por),
      registrado_por_usuario: texto(row.registrado_por_usuario_email),
      observaciones: texto(row.observaciones)
    }
  };

  return {
    tipoEvento: 'registro_manufactura',
    idEntidad: idManufactura,
    lote: texto(row.lote_producido),
    actor: texto(row.registrado_por_usuario_email || row.registrado_por || 'sistema'),
    fechaEvento: fechaISO(row.created_at),
    payload: ordenarValor(payload)
  };
}
