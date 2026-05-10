import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaSimple, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadInventarioProductoTerminado(idInventario) {
  const { rows } = await poolPostgres.query(
    `SELECT producto, lote, unidades_disponibles, fecha_vencimiento, estado
     FROM inventario_producto_terminado
     WHERE id_inventario = $1`,
    [idInventario]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'inventario_producto_terminado',
    inventario: {
      producto: texto(row.producto),
      lote: texto(row.lote),
      unidades_disponibles: numero(row.unidades_disponibles),
      fecha_vencimiento: fechaSimple(row.fecha_vencimiento),
      estado: texto(row.estado)
    }
  };

  return {
    tipoEvento: 'inventario_producto_terminado',
    idEntidad: idInventario,
    lote: texto(row.lote),
    actor: 'sistema',
    fechaEvento: new Date().toISOString(),
    payload: ordenarValor(payload)
  };
}
