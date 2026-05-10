import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadInventarioMateriaPrima(idInventario) {
  const { rows } = await poolPostgres.query(
    `SELECT imp.cantidad_disponible, imp.unidad_medida, imp.fecha_actualizacion, rm.nombre AS materia_prima
     FROM inventario_materias_primas imp
     JOIN raw_materials rm ON rm.id = imp.materia_prima_id
     WHERE imp.id = $1`,
    [idInventario]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'inventario_materia_prima',
    inventario: {
      materia_prima: texto(row.materia_prima),
      cantidad_disponible: numero(row.cantidad_disponible),
      unidad_medida: texto(row.unidad_medida),
      fecha_actualizacion: fechaISO(row.fecha_actualizacion)
    }
  };

  return {
    tipoEvento: 'inventario_materia_prima',
    idEntidad: idInventario,
    lote: texto(row.materia_prima),
    actor: 'sistema',
    fechaEvento: fechaISO(row.fecha_actualizacion),
    payload: ordenarValor(payload)
  };
}
