import { poolPostgres } from '../../../configuracion/postgresql.js';
import { booleano, fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadIngresoAlmacenamiento(idAlmacenamiento) {
  const { rows } = await poolPostgres.query(
    `SELECT al.*, op.codigo_orden, opp.producto, opp.tamano_presentacion,
            ua.nombre AS ubicacion, ua.tipo AS tipo_ubicacion,
            ui.email AS responsable_ingreso_email,
            ur.email AS responsable_resolucion_email
     FROM almacenamientos_lote al
     JOIN ordenes_produccion op ON op.id = al.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = al.id_producto
     JOIN ubicaciones_almacenamiento ua ON ua.id_ubicacion = al.id_ubicacion
     LEFT JOIN users ui ON ui.id = al.responsable_ingreso
     LEFT JOIN users ur ON ur.id = al.responsable_resolucion
     WHERE al.id_almacenamiento = $1`,
    [idAlmacenamiento]
  );
  const row = rows[0];
  if (!row) return null;
  const payload = {
    tipoEvento: 'ingreso_almacenamiento',
    almacenamiento: {
      codigo_orden: texto(row.codigo_orden),
      producto: texto(row.producto),
      tamano_presentacion: texto(row.tamano_presentacion),
      lote_producido: texto(row.lote_producido),
      ubicacion: texto(row.ubicacion),
      tipo_ubicacion: texto(row.tipo_ubicacion),
      fecha_ingreso: fechaISO(row.fecha_ingreso),
      temperatura_min_esperada_c: numero(row.temperatura_min_esperada_c),
      temperatura_max_esperada_c: numero(row.temperatura_max_esperada_c),
      temperatura_ingreso_c: numero(row.temperatura_ingreso_c),
      requiere_refrigeracion: booleano(row.requiere_refrigeracion),
      estado: texto(row.estado),
      observaciones_ingreso: texto(row.observaciones_ingreso),
      responsable_ingreso: texto(row.responsable_ingreso_email),
      resolucion_fecha: fechaISO(row.resolucion_fecha),
      resolucion_decision: texto(row.resolucion_decision),
      resolucion_motivo: texto(row.resolucion_motivo),
      resolucion_observaciones: texto(row.resolucion_observaciones),
      responsable_resolucion: texto(row.responsable_resolucion_email)
    }
  };
  return {
    tipoEvento: 'ingreso_almacenamiento',
    idEntidad: idAlmacenamiento,
    lote: texto(row.lote_producido),
    actor: texto(row.responsable_ingreso_email || 'sistema'),
    fechaEvento: fechaISO(row.fecha_ingreso),
    payload: ordenarValor(payload)
  };
}

