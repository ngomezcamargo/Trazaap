import bcrypt from 'bcryptjs';
import { poolPostgres } from '../src/configuracion/postgresql.js';
import { CATALOGO_PRODUCTOS, resolverPrefijoInternoProducto } from './catalogo-productos.js';
import { resolverPasswordSeed, USUARIOS_QA } from './seed-usuarios-qa.js';

async function seedRoles() {
  const roles = ['administrador', 'gerente', 'operario'];
  for (const role of roles) {
    await poolPostgres.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [role]);
  }
}

async function seedUsuariosQa() {
  for (const usuario of USUARIOS_QA) {
    const passwordHash = await bcrypt.hash(resolverPasswordSeed(usuario), 12);
    await poolPostgres.query(
      `INSERT INTO users (email, password_hash, role_id, is_active)
       VALUES ($1, $2, (SELECT id FROM roles WHERE name = $3), true)
       ON CONFLICT (email) DO NOTHING`,
      [usuario.email, passwordHash, usuario.rol]
    );
  }
}

async function seedProviders() {
  await poolPostgres.query(
    `INSERT INTO providers (nombre, nit, contacto, nombre_contacto, telefono, email, direccion, certificaciones, estado)
     VALUES
       ('Molinos Andinos', '900123456-1', 'Laura Diaz', 'Laura Diaz', '3001234567', 'contacto@molinosandinos.local', 'Zona Industrial Km 4', 'BPM vigente', 'activo'),
       ('Lacteos Norte', '800222111-3', 'Carlos Ruiz', 'Carlos Ruiz', '3109876543', 'ventas@lacteosnorte.local', 'Parque Empresarial Bodega 12', 'BPM vigente', 'activo')
     ON CONFLICT (nit) DO NOTHING`
  );
}

async function seedRawMaterials() {
  const materias = [
    ['Harina de trigo', 'Harina para produccion de pan', 'kilogramos', 'kilogramos', '', 'solido', 'Ambiente seco'],
    ['Levadura instantanea', 'Levadura seca para panificacion', 'gramos', 'gramos', '', 'solido', 'Ambiente seco'],
    ['Azucar refinada', 'Azucar para formulaciones de panaderia', 'kilogramos', 'kilogramos', '', 'solido', 'Ambiente seco']
  ];

  for (const materia of materias) {
    const actualizada = await poolPostgres.query(
      `UPDATE raw_materials
       SET descripcion = $2,
           unidad_medida = $3,
           unidad_medida_base = $4,
           descripcion_unidad_personalizada = $5,
           tipo_insumo = $6,
           condiciones_almacenamiento = $7,
           is_active = true,
           updated_at = NOW()
       WHERE LOWER(nombre) = LOWER($1)`,
      materia
    );

    if (!actualizada.rowCount) {
      await poolPostgres.query(
        `INSERT INTO raw_materials (
           nombre, descripcion, unidad_medida, unidad_medida_base,
           descripcion_unidad_personalizada, tipo_insumo, condiciones_almacenamiento
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        materia
      );
    }
  }
}

async function seedCatalogoProductos() {
  const client = await poolPostgres.connect();

  try {
    await client.query('BEGIN');
    const materiaResult = await client.query(
      `SELECT id
       FROM raw_materials
       WHERE LOWER(nombre) = LOWER($1)
       LIMIT 1`,
      ['Harina de trigo']
    );
    const harinaId = materiaResult.rows[0]?.id;
    if (!harinaId) throw new Error('No se encontro Harina de trigo para crear las recetas base');
    const columnasVariantes = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'producto_variantes'`
    );
    const tieneNombreVariante = columnasVariantes.rows.some((row) => row.column_name === 'nombre_variante');
    const columnasProductos = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'productos_fabricados'`
    );
    const tieneTamanoProducto = columnasProductos.rows.some((row) => row.column_name === 'tamano_presentacion');

    for (const ficha of CATALOGO_PRODUCTOS) {
      const existente = await client.query(
        `SELECT id
         FROM productos_fabricados
         WHERE LOWER(nombre) = LOWER($1)
         ORDER BY id
         LIMIT 1`,
        [ficha.nombre]
      );

      let productoId = existente.rows[0]?.id;
      const valoresProducto = [
        ficha.nombre,
        resolverPrefijoInternoProducto(ficha),
        ficha.categoria,
        ficha.descripcion,
        ficha.vida_util_dias,
        ficha.condiciones_almacenamiento,
        ficha.estado,
        ficha.requiere_inmersion,
        ficha.tiempo_fermentacion_minutos,
        ficha.temperatura_fermentacion_c,
        ficha.tiempo_horneado_minutos,
        ficha.temperatura_horneado_c,
        ficha.tiempo_inmersion_minutos,
        ficha.temperatura_inmersion_c
      ];

      if (productoId) {
        await client.query(
          `UPDATE productos_fabricados
           SET nombre = $1,
               prefijo_lote = COALESCE(prefijo_lote, $2),
               categoria = $3,
               descripcion = $4,
               vida_util_dias = $5,
               condiciones_almacenamiento = $6,
               estado = $7,
               requiere_inmersion = $8,
               tiempo_fermentacion_minutos = $9,
               temperatura_fermentacion_c = $10,
               tiempo_horneado_minutos = $11,
               temperatura_horneado_c = $12,
               tiempo_inmersion_minutos = $13,
               temperatura_inmersion_c = $14,
               updated_at = NOW()
           WHERE id = $15`,
          [...valoresProducto, productoId]
        );
      } else {
        const creado = tieneTamanoProducto
          ? await client.query(
            `INSERT INTO productos_fabricados (
               nombre, prefijo_lote, categoria, descripcion, vida_util_dias, condiciones_almacenamiento,
               estado, requiere_inmersion, tiempo_fermentacion_minutos,
               temperatura_fermentacion_c, tiempo_horneado_minutos, temperatura_horneado_c,
               tiempo_inmersion_minutos, temperatura_inmersion_c, tamano_presentacion
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING id`,
            [...valoresProducto, ficha.variantes[0].tamano_presentacion]
          )
          : await client.query(
            `INSERT INTO productos_fabricados (
               nombre, prefijo_lote, categoria, descripcion, vida_util_dias, condiciones_almacenamiento,
               estado, requiere_inmersion, tiempo_fermentacion_minutos,
               temperatura_fermentacion_c, tiempo_horneado_minutos, temperatura_horneado_c,
               tiempo_inmersion_minutos, temperatura_inmersion_c
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING id`,
            valoresProducto
          );
        productoId = creado.rows[0].id;
      }

      for (const variante of ficha.variantes) {
        let varianteResult = await client.query(
          `UPDATE producto_variantes
           SET peso_estimado_unidad = $3,
               unidad_medida = $4,
               estado = 'activo',
               updated_at = NOW()
           WHERE producto_id = $1 AND tamano_presentacion = $2
           RETURNING id`,
          [productoId, variante.tamano_presentacion, variante.peso_estimado_unidad, variante.unidad_medida]
        );

        if (!varianteResult.rows.length) {
          varianteResult = tieneNombreVariante
            ? await client.query(
              `INSERT INTO producto_variantes (
                 producto_id, nombre_variante, tamano_presentacion,
                 peso_estimado_unidad, unidad_medida, estado
               )
               VALUES ($1,$2,$2,$3,$4,'activo')
               RETURNING id`,
              [productoId, variante.tamano_presentacion, variante.peso_estimado_unidad, variante.unidad_medida]
            )
            : await client.query(
              `INSERT INTO producto_variantes (
                 producto_id, tamano_presentacion, peso_estimado_unidad, unidad_medida, estado
               )
               VALUES ($1,$2,$3,$4,'activo')
               RETURNING id`,
              [productoId, variante.tamano_presentacion, variante.peso_estimado_unidad, variante.unidad_medida]
            );
        }
        const varianteId = varianteResult.rows[0].id;
        const cantidadHarinaKg = Math.max((Number(variante.peso_estimado_unidad) * 0.6) / 1000, 0.001);
        const recetaExistente = await client.query(
          `SELECT id, observaciones
           FROM producto_variante_materia_prima
           WHERE variante_id = $1 AND materia_prima_id = $2
           ORDER BY id
           LIMIT 1`,
          [varianteId, harinaId]
        );
        const observacion = 'Receta base provisional calculada al 60% del peso estimado. Debe validarse con la formulacion oficial.';

        if (!recetaExistente.rows.length) {
          await client.query(
            `INSERT INTO producto_variante_materia_prima (
               variante_id, materia_prima_id, cantidad_requerida, observaciones
             )
             VALUES ($1,$2,$3,$4)`,
            [varianteId, harinaId, cantidadHarinaKg, observacion]
          );
        } else {
          const receta = recetaExistente.rows[0];
          const esProvisional = !receta.observaciones?.trim() || receta.observaciones.startsWith('Receta base provisional');
          if (esProvisional) {
            await client.query(
              `UPDATE producto_variante_materia_prima
               SET cantidad_requerida = $1, observaciones = $2
               WHERE id = $3`,
              [cantidadHarinaKg, observacion, receta.id]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedReceptionSample() {
  const query = `
    INSERT INTO receptions (
      fecha_recepcion,
      proveedor_id,
      materia_prima_id,
      cantidad,
      unidad_medida,
      unidad_presentacion,
      presentacion,
      lote_proveedor,
      numero_lote,
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
      'kilogramos',
      'sacos 50kg',
      'bulto',
      'LOT-HAR-2026-001',
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
      orden_produccion_id, producto, tamano_presentacion, cantidad_programada, observaciones
    )
    SELECT op.id, 'Bagel clasico', 'mediano', 500, 'Producto de ejemplo sprint 2'
    FROM ordenes_produccion op
    WHERE op.codigo_orden = 'OP-SEMILLA-001'
      AND NOT EXISTS (
        SELECT 1 FROM ordenes_produccion_productos p WHERE p.orden_produccion_id = op.id
      )`
  );
}

async function run() {
  await seedRoles();
  await seedUsuariosQa();
  await seedProviders();
  await seedRawMaterials();
  await seedCatalogoProductos();
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
