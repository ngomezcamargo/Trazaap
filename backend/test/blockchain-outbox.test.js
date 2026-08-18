import assert from 'node:assert/strict';
import test from 'node:test';
import { poolPostgres } from '../src/configuracion/postgresql.js';
import {
  claveDeduplificacion,
  encolarEventoBlockchain,
  reintentarEventoOutbox
} from '../src/modulos/blockchain/outbox.repository.js';

test('la clave de outbox distingue registro y nueva version sin guardar payloads', () => {
  assert.equal(
    claveDeduplificacion({ operacion: 'registrar', tipoEvento: 'control_almacenamiento', idEntidad: 9 }),
    'registrar:control_almacenamiento:9'
  );
  assert.notEqual(
    claveDeduplificacion({ operacion: 'registrar', tipoEvento: 'control_almacenamiento', idEntidad: 9 }),
    claveDeduplificacion({ operacion: 'versionar', tipoEvento: 'control_almacenamiento', idEntidad: 9 })
  );
});

test('la encolacion concurrente es idempotente y no crea duplicados', async () => {
  const idEntidad = `prueba-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const evento = { tipoEvento: 'control_almacenamiento', idEntidad, actor: 'pruebas' };
  try {
    await Promise.all(Array.from({ length: 6 }, () => encolarEventoBlockchain(evento)));
    const { rows } = await poolPostgres.query(
      `SELECT COUNT(*)::INTEGER AS cantidad, MAX(version_solicitud)::INTEGER AS version
       FROM blockchain_outbox WHERE deduplicacion_clave = $1`,
      [claveDeduplificacion({ ...evento, operacion: 'registrar' })]
    );
    assert.equal(rows[0].cantidad, 1);
    assert.equal(rows[0].version, 6);
  } finally {
    await poolPostgres.query('DELETE FROM blockchain_outbox WHERE id_entidad = $1', [idEntidad]);
  }
});

test('un evento fallido puede reiniciarse manualmente sin duplicarlo', async () => {
  const idEntidad = `reintento-${Date.now()}`;
  try {
    const item = await encolarEventoBlockchain({ tipoEvento: 'ingreso_almacenamiento', idEntidad, actor: 'pruebas' });
    await poolPostgres.query(
      `UPDATE blockchain_outbox SET estado = 'fallido', intentos = 10, ultimo_error = 'sin conexion'
       WHERE id_outbox = $1`,
      [item.id_outbox]
    );
    const reintentado = await reintentarEventoOutbox(item.id_outbox);
    assert.equal(reintentado.estado, 'pendiente');
    assert.equal(reintentado.intentos, 0);
  } finally {
    await poolPostgres.query('DELETE FROM blockchain_outbox WHERE id_entidad = $1', [idEntidad]);
  }
});

