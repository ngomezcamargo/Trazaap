import assert from 'node:assert/strict';
import test from 'node:test';
import { crearUsuarioSchema, actualizarUsuarioSchema } from '../src/modulos/usuarios/usuarios.schemas.js';
import { metadatosDocumentoSchema } from '../src/modulos/documentos/documentos.schemas.js';
import { crearLiberacionSchema } from '../src/modulos/liberacion/liberacion.schemas.js';
import { multiloteSchema } from '../src/modulos/reportes/reportes.schemas.js';

test('usuarios limita roles internos y exige contraseña robusta al crear', () => {
  assert.equal(crearUsuarioSchema.safeParse({ email: 'Admin@Trazaap.co', role: 'administrador', password: 'Segura2026A' }).success, true);
  assert.equal(crearUsuarioSchema.safeParse({ email: 'x@x.co', role: 'consumidor', password: 'Segura2026A' }).success, false);
  assert.equal(crearUsuarioSchema.safeParse({ email: 'x@x.co', role: 'operario', password: 'debil' }).success, false);
  assert.equal(actualizarUsuarioSchema.safeParse({ email: 'x@x.co', role: 'gerente', is_active: false, password: '' }).success, true);
});

test('RF17 acepta documentos sanitarios transversales con tipo y entidad emisora libres', () => {
  const base = { tipo_documental: 'Acta de inspeccion sanitaria', entidad_emisora: 'INVIMA' };
  assert.equal(metadatosDocumentoSchema.safeParse(base).success, true);
  assert.equal(metadatosDocumentoSchema.safeParse({ ...base, tipo_documental: 'x' }).success, false);
  assert.equal(metadatosDocumentoSchema.safeParse({ ...base, entidad_emisora: 'x' }).success, false);
  assert.equal(metadatosDocumentoSchema.safeParse({ ...base, fecha_emision: '2026-09-01', fecha_vencimiento: '2026-08-01' }).success, false);
});

test('liberacion permite retener un lote con una validacion no conforme y bloquea su aprobacion', () => {
  const base = {
    id_manufactura: 1,
    responsable_liberacion_usuario_id: 2,
    tipo_empaque: 'Bolsa sellada',
    unidades_empacadas: 10,
    peso_neto: 1,
    fecha_vencimiento: '2026-08-30',
    etiqueta_verificada: true,
    verificacion_envase: true,
    lote_visible: false,
    fecha_vencimiento_visible: true,
    empaque_conforme: true,
    producto_en_buen_estado: true,
    estado_liberacion: 'retenido',
    motivo_retencion: 'Lote no visible en el empaque'
  };
  const conLogistica = { ...base, numero_factura: 'FAC-1', conductor: 'Conductor de prueba', placa_vehiculo: 'ABC123' };
  assert.equal(crearLiberacionSchema.safeParse(conLogistica).success, false);
  assert.equal(crearLiberacionSchema.safeParse(base).success, true);
  assert.equal(crearLiberacionSchema.safeParse({ ...base, estado_liberacion: 'aprobado', motivo_retencion: '' }).success, false);
  assert.equal(crearLiberacionSchema.safeParse({ ...base, lote_visible: undefined }).success, false);
});

test('RF14 limita a 50 lotes y elimina duplicados conservando orden', () => {
  assert.deepEqual(multiloteSchema.parse({ lotes: ['A-1', 'A-1', 'B-2'] }).lotes, ['A-1', 'B-2']);
  assert.equal(multiloteSchema.safeParse({ lotes: Array.from({ length: 51 }, (_, i) => `L-${i}`) }).success, false);
});
