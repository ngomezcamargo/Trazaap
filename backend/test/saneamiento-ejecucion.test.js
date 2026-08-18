import assert from 'node:assert/strict';
import test from 'node:test';
import { ejecutarSaneamientoService } from '../src/modulos/saneamiento/saneamiento.service.js';

test('una actividad programada puede pasar a ejecutada conservando su identidad', async () => {
  const actualizar=async(id,d)=>({id_actividad:Number(id),estado:'ejecutada',...d});
  const resultado=await ejecutarSaneamientoService(8,{resultado:'Conforme'},{email:'operario@invalid.local'},actualizar,async()=>({estado:'PENDIENTE'}));
  assert.equal(resultado.registro.id_actividad,8);
  assert.equal(resultado.registro.estado,'ejecutada');
});

test('una actividad ya cerrada no puede ejecutarse por segunda vez', async () => {
  await assert.rejects(ejecutarSaneamientoService(8,{}, {email:'operario@invalid.local'},async()=>null),(error)=>error.status===409);
});
