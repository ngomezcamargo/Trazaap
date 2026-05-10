import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarInventarioInsumos() {
  const query = `
    SELECT
      i.id AS id_inventario,
      i.materia_prima_id AS id_materia_prima,
      rm.nombre AS materia_prima,
      i.cantidad_disponible,
      i.unidad_medida,
      i.fecha_actualizacion
    FROM inventario_materias_primas i
    JOIN raw_materials rm ON rm.id = i.materia_prima_id
    ORDER BY rm.nombre ASC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}

export async function listarInventarioProductoTerminado() {
  const query = `
    SELECT
      id_inventario,
      id_liberacion,
      producto,
      lote,
      unidades_disponibles,
      fecha_vencimiento,
      estado,
      updated_at
    FROM inventario_producto_terminado
    ORDER BY updated_at DESC, producto ASC
  `;

  const { rows } = await poolPostgres.query(query);
  return rows;
}
