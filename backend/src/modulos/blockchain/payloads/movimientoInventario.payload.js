import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadMovimientoInventario(idMovimiento) {
  const { rows } = await poolPostgres.query(
    `SELECT im.*, rm.nombre AS materia_prima
     FROM inventario_movimientos im
     JOIN raw_materials rm ON rm.id = im.materia_prima_id
     WHERE im.id = $1`,
    [idMovimiento]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'movimiento_inventario',
    movimiento: {
      materia_prima: texto(row.materia_prima),
      tipo_movimiento: texto(row.tipo_movimiento),
      cantidad: numero(row.cantidad),
      unidad_medida: texto(row.unidad_medida),
      referencia_tipo: texto(row.referencia_tipo),
      referencia_id: texto(row.referencia_id),
      observaciones: texto(row.observaciones),
      creado_por: texto(row.creado_por),
      creado_en: fechaISO(row.creado_en)
    }
  };

  return {
    tipoEvento: 'movimiento_inventario',
    idEntidad: idMovimiento,
    lote: `${texto(row.referencia_tipo)}:${texto(row.referencia_id)}`,
    actor: texto(row.creado_por || 'sistema'),
    fechaEvento: fechaISO(row.creado_en),
    payload: ordenarValor(payload)
  };
}
