import { poolPostgres } from '../../../configuracion/postgresql.js';
import { booleano, fechaISO, ordenarValor, texto } from './helpers.js';

export async function construirPayloadInspeccion(idInspeccion) {
  const { rows } = await poolPostgres.query(
    `SELECT
       i.olor,
       i.color,
       i.textura,
       i.estado_empaque,
       i.certificado_calidad,
       i.inspeccion_transporte,
       i.condiciones_vehiculo,
       i.higiene_conductor,
       i.observaciones_producto,
       i.observaciones_transporte,
       i.observaciones,
       i.decision_final,
       i.inspeccionado_por,
       i.inspeccionado_en,
       r.numero_lote,
       r.lote_proveedor,
       r.fecha_recepcion
     FROM reception_inspections i
     JOIN receptions r ON r.id = i.reception_id
     WHERE i.id = $1`,
    [idInspeccion]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'inspeccion_recepcion',
    inspeccion: {
      numero_lote: texto(row.numero_lote),
      lote_proveedor: texto(row.lote_proveedor),
      olor: booleano(row.olor),
      color: booleano(row.color),
      textura: booleano(row.textura),
      estado_empaque: booleano(row.estado_empaque),
      certificado_calidad: booleano(row.certificado_calidad),
      inspeccion_transporte: booleano(row.inspeccion_transporte),
      condiciones_vehiculo: booleano(row.condiciones_vehiculo),
      higiene_conductor: booleano(row.higiene_conductor),
      observaciones_producto: texto(row.observaciones_producto),
      observaciones_transporte: texto(row.observaciones_transporte),
      observaciones: texto(row.observaciones),
      decision_final: texto(row.decision_final),
      inspeccionado_por: texto(row.inspeccionado_por),
      inspeccionado_en: fechaISO(row.inspeccionado_en)
    }
  };

  return {
    tipoEvento: 'inspeccion_recepcion',
    idEntidad: idInspeccion,
    lote: texto(row.numero_lote || row.lote_proveedor),
    actor: texto(row.inspeccionado_por || 'sistema'),
    fechaEvento: fechaISO(row.inspeccionado_en || row.fecha_recepcion),
    payload: ordenarValor(payload)
  };
}
