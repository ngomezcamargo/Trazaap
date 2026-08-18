import { poolPostgres } from '../../configuracion/postgresql.js';

export async function listarClientes({ soloActivos = false } = {}) {
  const { rows } = await poolPostgres.query(
    `SELECT *
     FROM clientes
     WHERE ($1::BOOLEAN = false OR estado = 'activo')
     ORDER BY nombre_razon_social, id_cliente`,
    [soloActivos]
  );
  return rows;
}

export async function buscarClientePorId(id, db = poolPostgres) {
  const { rows } = await db.query('SELECT * FROM clientes WHERE id_cliente = $1', [id]);
  return rows[0] || null;
}

export async function buscarClientePorDocumento(documento, db = poolPostgres) {
  const { rows } = await db.query(
    'SELECT * FROM clientes WHERE upper(btrim(nit_documento)) = upper(btrim($1))',
    [documento]
  );
  return rows[0] || null;
}

export async function crearCliente(data) {
  const { rows } = await poolPostgres.query(
    `INSERT INTO clientes (
       nombre_razon_social, nit_documento, nombre_contacto, telefono, email, direccion, estado
     ) VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)
     RETURNING *`,
    [
      data.nombre_razon_social,
      data.nit_documento,
      data.nombre_contacto,
      data.telefono,
      data.email || '',
      data.direccion,
      data.estado
    ]
  );
  return rows[0];
}

export async function actualizarCliente(id, data) {
  const { rows } = await poolPostgres.query(
    `UPDATE clientes
     SET nombre_razon_social = $2,
         nit_documento = $3,
         nombre_contacto = $4,
         telefono = $5,
         email = NULLIF($6, ''),
         direccion = $7,
         estado = $8,
         updated_at = NOW()
     WHERE id_cliente = $1
     RETURNING *`,
    [
      id,
      data.nombre_razon_social,
      data.nit_documento,
      data.nombre_contacto,
      data.telefono,
      data.email || '',
      data.direccion,
      data.estado
    ]
  );
  return rows[0] || null;
}
