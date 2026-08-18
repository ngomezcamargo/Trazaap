import { poolPostgres } from '../../../configuracion/postgresql.js';
import { booleano, fechaISO, fechaSimple, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadLiberacion(idLiberacion) {
  const { rows } = await poolPostgres.query(
    `SELECT
       lp.*,
       op.codigo_orden,
       opp.producto,
       u.email AS responsable_liberacion_email
     FROM liberacion_producto lp
     JOIN ordenes_produccion op ON op.id = lp.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = lp.id_producto
     LEFT JOIN users u ON u.id = lp.responsable_liberacion
     WHERE lp.id_liberacion = $1`,
    [idLiberacion]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'liberacion_producto',
    liberacion: {
      codigo_orden: texto(row.codigo_orden),
      producto: texto(row.producto),
      lote_producido: texto(row.lote_producido),
      fecha_liberacion: fechaISO(row.fecha_liberacion),
      responsable_liberacion: texto(row.responsable_liberacion_email || row.responsable_liberacion),
      tipo_empaque: texto(row.tipo_empaque),
      ...(row.numero_factura !== null || row.conductor !== null || row.placa_vehiculo !== null
        ? {
            numero_factura: texto(row.numero_factura),
            conductor: texto(row.conductor),
            placa_vehiculo: texto(row.placa_vehiculo),
            limpieza_vehiculo: texto(row.limpieza_vehiculo),
            documentacion_dotacion: texto(row.documentacion_dotacion)
          }
        : {}),
      unidades_producidas: numero(row.unidades_producidas),
      unidades_empacadas: numero(row.unidades_empacadas),
      peso_neto: numero(row.peso_neto),
      fecha_vencimiento: fechaSimple(row.fecha_vencimiento),
      etiqueta_verificada: booleano(row.etiqueta_verificada),
      verificacion_envase: booleano(row.verificacion_envase),
      lote_visible: booleano(row.lote_visible),
      fecha_vencimiento_visible: booleano(row.fecha_vencimiento_visible),
      empaque_conforme: booleano(row.empaque_conforme),
      producto_en_buen_estado: booleano(row.producto_en_buen_estado),
      estado_liberacion: texto(row.estado_liberacion),
      motivo_retencion: texto(row.motivo_retencion),
      motivo_rechazo: texto(row.motivo_rechazo),
      observaciones: texto(row.observaciones)
    }
  };

  return {
    tipoEvento: 'liberacion_producto',
    idEntidad: idLiberacion,
    lote: texto(row.lote_producido),
    actor: texto(row.responsable_liberacion_email || row.responsable_liberacion || 'sistema'),
    fechaEvento: fechaISO(row.fecha_liberacion),
    payload: ordenarValor(payload)
  };
}
