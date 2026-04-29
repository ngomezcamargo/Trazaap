import bcrypt from 'bcryptjs';
import { poolPostgres } from '../src/configuracion/postgresql.js';

async function seedRoles() {
  const roles = ['admin', 'gerencia', 'operario'];
  for (const role of roles) {
    await poolPostgres.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [role]);
  }
}

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash('Admin123*', 12);
  const query = `
    INSERT INTO users (email, password_hash, role_id)
    VALUES (
      $1,
      $2,
      (SELECT id FROM roles WHERE name = 'admin')
    )
    ON CONFLICT (email) DO NOTHING
  `;

  await poolPostgres.query(query, ['admin@trazaap.local', passwordHash]);
}

async function seedProviders() {
  await poolPostgres.query(
    `INSERT INTO providers (nombre, nit, contacto, telefono, email, direccion, estado)
     VALUES
       ('Molinos Andinos', '900123456-1', 'Laura Diaz', '3001234567', 'contacto@molinosandinos.local', 'Zona Industrial Km 4', 'activo'),
       ('Lacteos Norte', '800222111-3', 'Carlos Ruiz', '3109876543', 'ventas@lacteosnorte.local', 'Parque Empresarial Bodega 12', 'activo')
     ON CONFLICT (nit) DO NOTHING`
  );
}

async function seedRawMaterials() {
  await poolPostgres.query(
    `INSERT INTO raw_materials (nombre, descripcion)
     VALUES
       ('Harina de trigo', 'Harina para produccion de pan'),
       ('Levadura instantanea', 'Levadura seca para panificacion'),
       ('Azucar refinada', 'Azucar para formulaciones de panaderia')
     ON CONFLICT (nombre) DO NOTHING`
  );
}

async function seedReceptionSample() {
  const query = `
    INSERT INTO receptions (
      fecha_recepcion,
      proveedor_id,
      materia_prima_id,
      cantidad,
      unidad_presentacion,
      lote_proveedor,
      fecha_vencimiento,
      temperatura_recepcion,
      peso_recibido,
      observaciones,
      recibido_por,
      estado_recepcion
    )
    SELECT
      NOW(),
      p.id,
      rm.id,
      1000,
      'sacos 50kg',
      'LOT-HAR-2026-001',
      CURRENT_DATE + INTERVAL '120 days',
      22.5,
      1000,
      'Recepcion inicial de prueba',
      u.id,
      'aceptado'
    FROM providers p, raw_materials rm, users u
    WHERE p.nit = '900123456-1'
      AND rm.nombre = 'Harina de trigo'
      AND u.email = 'admin@trazaap.local'
      AND NOT EXISTS (
        SELECT 1 FROM receptions WHERE lote_proveedor = 'LOT-HAR-2026-001'
      )
  `;

  const inserted = await poolPostgres.query(query);

  if (inserted.rowCount > 0) {
    await poolPostgres.query(
      `INSERT INTO trazabilidad_eventos (recepcion_id, lote, tipo_evento, actor, payload)
       SELECT r.id, r.lote_proveedor, 'RECEPTION_CREATED', 'admin@trazaap.local', '{"estado":"aceptado"}'::jsonb
       FROM receptions r
       WHERE r.lote_proveedor = 'LOT-HAR-2026-001'`
    );
  }
}

async function seedProduccionYLiberacion() {
  await poolPostgres.query(
    `INSERT INTO ordenes_produccion (fecha_produccion, codigo_orden, responsable_produccion, estado, observaciones, creado_por)
     SELECT CURRENT_DATE, 'OP-SEMILLA-001', u.id, 'pendiente', 'Orden de ejemplo sprint 2', u.id
     FROM users u
     WHERE u.email = 'admin@trazaap.local'
     AND NOT EXISTS (SELECT 1 FROM ordenes_produccion WHERE codigo_orden = 'OP-SEMILLA-001')`
  );

  await poolPostgres.query(
    `INSERT INTO ordenes_produccion_productos (
      orden_produccion_id, producto, codigo_producto, tamano_presentacion,
      cantidad_programada, cantidad_real_producida, unidad_medida, lote_producto_terminado
    )
    SELECT op.id, 'Bagel clasico', 'BAG-001', 'mediano', 500, 0, 'unidades', 'LOT-BAG-2026-001'
    FROM ordenes_produccion op
    WHERE op.codigo_orden = 'OP-SEMILLA-001'
      AND NOT EXISTS (
        SELECT 1 FROM ordenes_produccion_productos p WHERE p.orden_produccion_id = op.id
      )`
  );
}

async function run() {
  await seedRoles();
  await seedAdminUser();
  await seedProviders();
  await seedRawMaterials();
  await seedReceptionSample();
  await seedProduccionYLiberacion();
  console.log('Seed completed');
  await poolPostgres.end();
}

run().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await poolPostgres.end();
  process.exit(1);
});
