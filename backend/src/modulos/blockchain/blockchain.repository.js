import { poolPostgres } from '../../configuracion/postgresql.js';

export async function guardarEventoBlockchain(data) {
  const query = `
    INSERT INTO eventos_blockchain (
      tipo_evento,
      lote,
      hash,
      fecha_evento,
      usuario,
      payload_json
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, tipo_evento, lote, hash, fecha_evento, usuario, payload_json, created_at
  `;

  const { rows } = await poolPostgres.query(query, [
    data.tipo_evento,
    data.lote,
    data.hash,
    data.fecha_evento,
    data.usuario,
    JSON.stringify(data.payload_json)
  ]);

  return rows[0];
}

export async function listarEventosBlockchainPorLote(lote) {
  const query = `
    SELECT id, tipo_evento, hash, fecha_evento, usuario, payload_json, created_at
    FROM eventos_blockchain
    WHERE lote = $1
    ORDER BY fecha_evento DESC, created_at DESC
  `;

  const { rows } = await poolPostgres.query(query, [lote]);
  return rows;
}
