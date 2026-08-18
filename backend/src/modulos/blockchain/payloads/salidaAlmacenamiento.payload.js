import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadSalidaAlmacenamiento(idAlmacenamiento) {
  const { rows } = await poolPostgres.query(
    `SELECT al.*, op.codigo_orden, opp.producto, opp.tamano_presentacion,
            ua.nombre AS ubicacion, u.email AS responsable_salida_email
     FROM almacenamientos_lote al
     JOIN ordenes_produccion op ON op.id = al.id_orden_produccion
     JOIN ordenes_produccion_productos opp ON opp.id = al.id_producto
     JOIN ubicaciones_almacenamiento ua ON ua.id_ubicacion = al.id_ubicacion
     LEFT JOIN users u ON u.id = al.responsable_salida
     WHERE al.id_almacenamiento = $1 AND al.fecha_salida IS NOT NULL`,
    [idAlmacenamiento]
  );
  const row = rows[0];
  if (!row) return null;
  const payload = {
    tipoEvento: 'salida_almacenamiento',
    salida: {
      codigo_orden: texto(row.codigo_orden),
      producto: texto(row.producto),
      tamano_presentacion: texto(row.tamano_presentacion),
      lote_producido: texto(row.lote_producido),
      ubicacion: texto(row.ubicacion),
      fecha_salida: fechaISO(row.fecha_salida),
      temperatura_salida_c: numero(row.temperatura_salida_c),
      temperatura_min_esperada_c: numero(row.temperatura_min_esperada_c),
      temperatura_max_esperada_c: numero(row.temperatura_max_esperada_c),
      estado_producto_salida: texto(row.estado_producto_salida),
      decision_salida: texto(row.decision_salida),
      estado_final: texto(row.estado),
      observaciones_salida: texto(row.observaciones_salida),
      responsable_salida: texto(row.responsable_salida_email)
    }
  };
  return {
    tipoEvento: 'salida_almacenamiento',
    idEntidad: idAlmacenamiento,
    lote: texto(row.lote_producido),
    actor: texto(row.responsable_salida_email || 'sistema'),
    fechaEvento: fechaISO(row.fecha_salida),
    payload: ordenarValor(payload)
  };
}
