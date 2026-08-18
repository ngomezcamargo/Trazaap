import { poolPostgres } from '../../configuracion/postgresql.js';
export async function listarPendientesEnvasado() {
  const { rows } = await poolPostgres.query(`SELECT rm.id_manufactura, rm.lote_producido AS lote, opp.producto
    FROM registro_manufactura rm JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
    LEFT JOIN operaciones_envasado oe ON oe.id_manufactura = rm.id_manufactura
    WHERE oe.id_envasado IS NULL ORDER BY rm.created_at`);
  return rows;
}
export async function listarEnvasados(lote = '') {
  const { rows } = await poolPostgres.query(`SELECT oe.*, u.email AS responsable_email, opp.producto
    FROM operaciones_envasado oe JOIN users u ON u.id = oe.responsable
    JOIN registro_manufactura rm ON rm.id_manufactura = oe.id_manufactura
    JOIN ordenes_produccion_productos opp ON opp.id = rm.id_producto
    WHERE ($1 = '' OR oe.lote = $1) ORDER BY oe.fecha_operacion DESC`, [lote]);
  return rows;
}
export async function buscarManufacturaEnvasado(id) {
  const { rows } = await poolPostgres.query('SELECT id_manufactura, lote_producido FROM registro_manufactura WHERE id_manufactura=$1', [id]);
  return rows[0] || null;
}
export async function crearEnvasado(data) {
  const { rows } = await poolPostgres.query(`INSERT INTO operaciones_envasado
    (id_manufactura,lote,fecha_operacion,responsable,descripcion_operacion,resultado,observaciones)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.id_manufactura,data.lote,data.fecha_operacion,data.responsable,data.descripcion_operacion,data.resultado,data.observaciones]);
  return rows[0];
}
