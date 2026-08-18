import { poolPostgres } from '../../configuracion/postgresql.js';

export function claveDeduplificacion({ operacion = 'registrar', tipoEvento, idEntidad }) {
  return `${operacion}:${tipoEvento}:${String(idEntidad)}`;
}

export async function encolarEventoBlockchain(evento, db = poolPostgres) {
  const operacion = evento.operacion || 'registrar';
  const deduplicacion = claveDeduplificacion({ ...evento, operacion });
  const { rows } = await db.query(
    `INSERT INTO blockchain_outbox (
       tipo_evento, id_entidad, operacion, actor, deduplicacion_clave
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (deduplicacion_clave) DO UPDATE SET
       actor = EXCLUDED.actor,
       version_solicitud = blockchain_outbox.version_solicitud + 1,
       estado = CASE
         WHEN blockchain_outbox.estado = 'procesando' THEN 'procesando'
         ELSE 'pendiente'
       END,
       proximo_intento = NOW(),
       ultimo_error = NULL,
       actualizado_en = NOW()
     RETURNING *`,
    [evento.tipoEvento, String(evento.idEntidad), operacion, evento.actor || 'sistema', deduplicacion]
  );
  return rows[0];
}

export async function tomarSiguienteEventoOutbox(maxIntentos = 10) {
  const { rows } = await poolPostgres.query(
    `WITH candidato AS (
       SELECT id_outbox
       FROM blockchain_outbox
       WHERE intentos < $1
         AND (
           (estado = 'pendiente' AND proximo_intento <= NOW())
           OR (estado = 'procesando' AND bloqueado_en < NOW() - INTERVAL '5 minutes')
         )
       ORDER BY proximo_intento, creado_en
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE blockchain_outbox o
     SET estado = 'procesando',
         intentos = o.intentos + 1,
         bloqueado_en = NOW(),
         actualizado_en = NOW()
     FROM candidato
     WHERE o.id_outbox = candidato.id_outbox
     RETURNING o.*`,
    [maxIntentos]
  );
  return rows[0] || null;
}

export async function marcarEventoOutboxEnviado(id, versionSolicitud, transaccionFabric = null) {
  const { rows } = await poolPostgres.query(
    `UPDATE blockchain_outbox
     SET estado = CASE WHEN version_solicitud = $2 THEN 'enviado' ELSE 'pendiente' END,
         transaccion_fabric = CASE WHEN version_solicitud = $2 THEN $3 ELSE transaccion_fabric END,
         procesado_en = CASE WHEN version_solicitud = $2 THEN NOW() ELSE procesado_en END,
         proximo_intento = CASE WHEN version_solicitud = $2 THEN proximo_intento ELSE NOW() END,
         bloqueado_en = NULL,
         ultimo_error = NULL,
         actualizado_en = NOW()
     WHERE id_outbox = $1
     RETURNING *`,
    [id, versionSolicitud, transaccionFabric]
  );
  return rows[0] || null;
}

export async function marcarEventoOutboxConError(item, error, maxIntentos = 10) {
  const segundos = Math.min(300, 2 ** Math.min(item.intentos, 8));
  const { rows } = await poolPostgres.query(
    `UPDATE blockchain_outbox
     SET estado = CASE
           WHEN version_solicitud <> $2 THEN 'pendiente'
           WHEN intentos >= $4 THEN 'fallido'
           ELSE 'pendiente'
         END,
         proximo_intento = CASE
           WHEN version_solicitud <> $2 THEN NOW()
           ELSE NOW() + ($5 * INTERVAL '1 second')
         END,
         ultimo_error = $3,
         bloqueado_en = NULL,
         actualizado_en = NOW()
     WHERE id_outbox = $1
     RETURNING *`,
    [item.id_outbox, item.version_solicitud, String(error?.message || error).slice(0, 4000), maxIntentos, segundos]
  );
  return rows[0] || null;
}

export async function marcarEventoOutboxFallido(item, error) {
  const { rows } = await poolPostgres.query(
    `UPDATE blockchain_outbox
     SET estado = 'fallido',
         ultimo_error = $3,
         bloqueado_en = NULL,
         actualizado_en = NOW()
     WHERE id_outbox = $1 AND version_solicitud = $2
     RETURNING *`,
    [item.id_outbox, item.version_solicitud, String(error?.message || error).slice(0, 4000)]
  );
  return rows[0] || null;
}

export async function listarOutbox({ estado = '', limite = 100 } = {}) {
  const { rows } = await poolPostgres.query(
    `SELECT *
     FROM blockchain_outbox
     WHERE ($1 = '' OR estado = $1)
     ORDER BY CASE estado WHEN 'fallido' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END,
              actualizado_en DESC
     LIMIT $2`,
    [estado, Math.min(Math.max(Number(limite) || 100, 1), 500)]
  );
  return rows;
}

export async function resumirOutbox() {
  const { rows } = await poolPostgres.query(
    `SELECT estado, COUNT(*)::INTEGER AS cantidad
     FROM blockchain_outbox
     GROUP BY estado`
  );
  return Object.fromEntries(rows.map((row) => [row.estado, row.cantidad]));
}

export async function reintentarEventoOutbox(id) {
  const { rows } = await poolPostgres.query(
    `UPDATE blockchain_outbox
     SET estado = 'pendiente', intentos = 0, proximo_intento = NOW(),
         ultimo_error = NULL, bloqueado_en = NULL, actualizado_en = NOW()
     WHERE id_outbox = $1 AND estado IN ('fallido', 'pendiente')
     RETURNING *`,
    [id]
  );
  return rows[0] || null;
}
