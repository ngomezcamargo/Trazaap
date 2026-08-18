import assert from 'node:assert/strict';
import test from 'node:test';
import { crearUsuarioSchema, actualizarUsuarioSchema } from '../src/modulos/usuarios/usuarios.schemas.js';
import { envasadoSchema } from '../src/modulos/envasado/envasado.schemas.js';
import { saneamientoSchema } from '../src/modulos/saneamiento/saneamiento.schemas.js';
import { decisionCasoSchema, devolucionSchema } from '../src/modulos/devoluciones/devoluciones.schemas.js';
import { metadatosDocumentoSchema } from '../src/modulos/documentos/documentos.schemas.js';
import { controlSchema, definicionSchema } from '../src/modulos/calidad/calidad.schemas.js';
import { multiloteSchema } from '../src/modulos/reportes/reportes.schemas.js';

test('usuarios limita roles internos y exige contraseña robusta al crear', () => {
  assert.equal(crearUsuarioSchema.safeParse({ email: 'Admin@Trazaap.co', role: 'administrador', password: 'Segura2026A' }).success, true);
  assert.equal(crearUsuarioSchema.safeParse({ email: 'x@x.co', role: 'consumidor', password: 'Segura2026A' }).success, false);
  assert.equal(crearUsuarioSchema.safeParse({ email: 'x@x.co', role: 'operario', password: 'debil' }).success, false);
  assert.equal(actualizarUsuarioSchema.safeParse({ email: 'x@x.co', role: 'gerente', is_active: false, password: '' }).success, true);
});

test('envasado requiere manufactura, responsable, fecha, operacion y resultado', () => {
  const base = { id_manufactura: 1, responsable: 2, fecha_operacion: '2026-08-17T15:00:00.000Z', descripcion_operacion: 'Envasado y sellado', resultado: 'Conforme' };
  assert.equal(envasadoSchema.safeParse(base).success, true);
  assert.equal(envasadoSchema.safeParse({ ...base, resultado: '' }).success, false);
});

test('saneamiento ejecutado exige fecha, responsable y resultado', () => {
  const base = { tipo: 'limpieza', procedimiento: 'Procedimiento aprobado', fecha_programada: '2026-08-17T15:00:00.000Z', estado: 'ejecutada', lista_chequeo: [] };
  assert.equal(saneamientoSchema.safeParse(base).success, false);
  assert.equal(saneamientoSchema.safeParse({ ...base, fecha_ejecucion: '2026-08-17T16:00:00.000Z', responsable: 2, resultado: 'Conforme' }).success, true);
});

test('RF16 distingue devolucion posterior de rechazo previo', () => {
  const base = { lote: 'BG-1', cantidad: 2, fecha_registro: '2026-08-17T15:00:00.000Z', motivo: 'Empaque averiado', accion: 'pendiente_decision', responsable: 2 };
  assert.equal(devolucionSchema.safeParse({ ...base, tipo_caso: 'devolucion_post_despacho' }).success, false);
  assert.equal(devolucionSchema.safeParse({ ...base, tipo_caso: 'devolucion_post_despacho', id_cliente: 3, id_despacho: 4 }).success, true);
  assert.equal(devolucionSchema.safeParse({ ...base, tipo_caso: 'rechazo_pre_despacho', id_despacho: 4 }).success, false);
  assert.equal(devolucionSchema.safeParse({ ...base, tipo_caso: 'rechazo_pre_despacho' }).success, true);
  assert.equal(decisionCasoSchema.safeParse({ accion: 'retiro', fecha_decision: '2026-08-17T16:00:00.000Z', responsable: 2 }).success, true);
  assert.equal(decisionCasoSchema.safeParse({ accion: 'reincorporar', fecha_decision: '2026-08-17T16:00:00.000Z', responsable: 2 }).success, false);
});

test('RF17 asocia cada documento exclusivamente a proveedor o materia prima', () => {
  const base = { tipo_documental: 'ficha_tecnica' };
  assert.equal(metadatosDocumentoSchema.safeParse({ ...base, proveedor_id: 1 }).success, true);
  assert.equal(metadatosDocumentoSchema.safeParse({ ...base, materia_prima_id: 1 }).success, true);
  assert.equal(metadatosDocumentoSchema.safeParse({ ...base, proveedor_id: 1, materia_prima_id: 2 }).success, false);
  assert.equal(metadatosDocumentoSchema.safeParse(base).success, false);
  assert.equal(metadatosDocumentoSchema.safeParse({ ...base, proveedor_id: 1, fecha_emision: '2026-09-01', fecha_vencimiento: '2026-08-01' }).success, false);
});

test('calidad acepta referencias configurables y no admite resultados ambiguos', () => {
  assert.equal(definicionSchema.safeParse({ categoria: 'quimico', parametro: 'Parametro aprobado', referencia: 'Método interno vigente', activo: true }).success, true);
  assert.equal(definicionSchema.safeParse({ categoria: 'quimico', parametro: 'Sin referencia', activo: true }).success, false);
  assert.equal(definicionSchema.safeParse({ categoria: 'fisico', parametro: 'Rango', limite_minimo: 10, limite_maximo: 5, activo: true }).success, false);
  const base = { id_manufactura: 1, id_definicion: 1, responsable: 2, fecha_control: '2026-08-17T15:00:00.000Z' };
  assert.equal(controlSchema.safeParse({ ...base, resultado_numerico: 3 }).success, true);
  assert.equal(controlSchema.safeParse({ ...base, resultado_texto: 'Ausencia' }).success, true);
  assert.equal(controlSchema.safeParse({ ...base, resultado_numerico: 3, resultado_texto: 'Tres' }).success, false);
});

test('RF14 limita a 50 lotes y elimina duplicados conservando orden', () => {
  assert.deepEqual(multiloteSchema.parse({ lotes: ['A-1', 'A-1', 'B-2'] }).lotes, ['A-1', 'B-2']);
  assert.equal(multiloteSchema.safeParse({ lotes: Array.from({ length: 51 }, (_, i) => `L-${i}`) }).success, false);
});
