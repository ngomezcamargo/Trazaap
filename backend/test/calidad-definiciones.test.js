import assert from 'node:assert/strict';
import test from 'node:test';
import { actualizarDefinicionService } from '../src/modulos/calidad/calidad.service.js';

test('administracion de calidad permite editar o desactivar una definicion configurable', async () => {
  const data = { categoria: 'fisico', parametro: 'Parámetro ficticio', activo: false };
  const resultado = await actualizarDefinicionService(7, data, async (id, payload) => ({ id_definicion: Number(id), ...payload }));
  assert.equal(resultado.id_definicion, 7);
  assert.equal(resultado.activo, false);
});

test('actualizar una definicion inexistente conserva respuesta 404', async () => {
  await assert.rejects(actualizarDefinicionService(99, {}, async () => null), (error) => error.status === 404);
});
