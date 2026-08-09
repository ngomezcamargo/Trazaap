import { poolPostgres } from '../src/configuracion/postgresql.js';
import { registrarVersionEventoCritico } from '../src/modulos/blockchain/blockchain.service.js';
import { crearRecepcionService } from '../src/modulos/recepciones/recepciones.service.js';

const PROVEEDORES = [
  {
    clave: 'secos',
    nombre: 'Molinos Andinos',
    nit: '900123456-1',
    contacto: 'Laura Diaz',
    telefono: '3001234567',
    email: 'contacto@molinosandinos.local',
    direccion: 'Zona Industrial Km 4',
    certificaciones: 'BPM vigente'
  },
  {
    clave: 'refrigerados',
    nombre: 'Lacteos Norte',
    nit: '800222111-3',
    contacto: 'Carlos Ruiz',
    telefono: '3109876543',
    email: 'ventas@lacteosnorte.local',
    direccion: 'Parque Empresarial Bodega 12',
    certificaciones: 'BPM vigente'
  },
  {
    clave: 'especializados',
    nombre: 'Insumos Panaderos Bogota',
    nit: '901888777-2',
    contacto: 'Andrea Torres',
    telefono: '3205550188',
    email: 'pedidos@insumospanaderos.local',
    direccion: 'Central de Abastos, bodega 18',
    certificaciones: 'BPM y fichas tecnicas vigentes'
  }
];

const MATERIAS_PRIMAS = [
  ['Harina de trigo', 'Harina de panificacion para masas base.', 'kilogramos', 'solido', 'secos', 250],
  ['Harina de trigo extrapremium', 'Harina de fuerza para bagels y productos especiales.', 'kilogramos', 'solido', 'secos', 250],
  ['Harina de trigo integral', 'Harina integral para referencias multicereales e integrales.', 'kilogramos', 'solido', 'secos', 200],
  ['Agua potable', 'Agua apta para la elaboracion de alimentos.', 'litros', 'liquido', 'especializados', 500],
  ['Levadura instantanea', 'Levadura seca para panificacion.', 'gramos', 'solido', 'especializados', 10000],
  ['Azucar refinada', 'Azucar blanca para panaderia y galleteria.', 'kilogramos', 'solido', 'especializados', 100],
  ['Sal', 'Sal refinada de uso alimentario.', 'gramos', 'solido', 'especializados', 10000],
  ['Aceite de girasol', 'Aceite vegetal para masas y acabados.', 'litros', 'liquido', 'especializados', 100],
  ['Eritritol y stevia', 'Mezcla de endulzantes naturales.', 'gramos', 'solido', 'especializados', 5000],
  ['Propionato de calcio', 'Conservante de uso alimentario para productos de panaderia.', 'gramos', 'solido', 'especializados', 5000],
  ['Acido sorbico', 'Conservante de uso alimentario.', 'gramos', 'solido', 'especializados', 3000],
  ['Avena en hojuelas', 'Avena para productos multicereales y galletas.', 'kilogramos', 'solido', 'secos', 80],
  ['Semillas de ajonjoli', 'Semillas para mezcla y cobertura.', 'kilogramos', 'solido', 'especializados', 50],
  ['Semillas de chia', 'Semillas para productos multicereales.', 'kilogramos', 'solido', 'especializados', 40],
  ['Semillas de amapola', 'Semillas para productos y coberturas.', 'kilogramos', 'solido', 'especializados', 40],
  ['Semillas de girasol', 'Semillas para productos multicereales.', 'kilogramos', 'solido', 'especializados', 40],
  ['Cebolla en escamas', 'Cebolla deshidratada para referencias saborizadas.', 'kilogramos', 'solido', 'especializados', 30],
  ['Oregano deshidratado', 'Oregano para masas y coberturas.', 'kilogramos', 'solido', 'especializados', 25],
  ['Ajo deshidratado', 'Ajo para croutones y panes saborizados.', 'kilogramos', 'solido', 'especializados', 25],
  ['Mezcla de finas hierbas', 'Mezcla de hierbas deshidratadas para panaderia.', 'kilogramos', 'solido', 'especializados', 25],
  ['Chips de chocolate', 'Chips horneables para panes y galletas.', 'kilogramos', 'solido', 'especializados', 60],
  ['Cacao en polvo', 'Cacao para masas de chocolate.', 'kilogramos', 'solido', 'especializados', 50],
  ['Uvas pasas deshidratadas', 'Uvas pasas para panes y galletas.', 'kilogramos', 'solido', 'especializados', 60],
  ['Canela en polvo', 'Canela para rollos, bagels y galletas.', 'gramos', 'solido', 'especializados', 5000],
  ['Huevos', 'Huevos frescos para productos no veganos.', 'unidad', 'unitario', 'refrigerados', 600],
  ['Margarina vegetal', 'Margarina para masas de panaderia y galleteria.', 'kilogramos', 'solido', 'refrigerados', 100],
  ['Margarina para hojaldre', 'Margarina especializada para laminado.', 'kilogramos', 'solido', 'refrigerados', 100],
  ['Almendras', 'Almendras para referencias especiales.', 'kilogramos', 'solido', 'especializados', 40],
  ['Arandanos deshidratados', 'Arandanos para referencias saborizadas.', 'kilogramos', 'solido', 'especializados', 40],
  ['Coco rallado', 'Coco deshidratado para alfajores y acabados.', 'kilogramos', 'solido', 'especializados', 40],
  ['Relleno de fresa', 'Relleno estable para productos de galleteria.', 'kilogramos', 'solido', 'especializados', 40]
];

const BASE_PAN = [
  ['Harina de trigo', 0.60],
  ['Agua potable', 0.30],
  ['Levadura instantanea', 12],
  ['Sal', 12],
  ['Azucar refinada', 0.04],
  ['Aceite de girasol', 0.03],
  ['Propionato de calcio', 2]
];

const PERFILES = {
  bagel: [
    ['Harina de trigo extrapremium', 0.62],
    ['Agua potable', 0.30],
    ['Levadura instantanea', 12],
    ['Sal', 12],
    ['Eritritol y stevia', 10],
    ['Propionato de calcio', 2],
    ['Acido sorbico', 1]
  ],
  trenza: [
    ['Harina de trigo', 0.54],
    ['Agua potable', 0.25],
    ['Aceite de girasol', 0.10],
    ['Azucar refinada', 0.08],
    ['Huevos', 1.5],
    ['Levadura instantanea', 18],
    ['Sal', 12],
    ['Propionato de calcio', 2]
  ],
  molde: [
    ['Harina de trigo', 0.56],
    ['Agua potable', 0.28],
    ['Aceite de girasol', 0.08],
    ['Azucar refinada', 0.05],
    ['Levadura instantanea', 15],
    ['Sal', 12],
    ['Propionato de calcio', 2]
  ],
  rolloCanela: [
    ['Harina de trigo', 0.48],
    ['Agua potable', 0.20],
    ['Azucar refinada', 0.15],
    ['Margarina vegetal', 0.10],
    ['Huevos', 2],
    ['Levadura instantanea', 15],
    ['Sal', 6],
    ['Canela en polvo', 15]
  ],
  panChocolate: [
    ['Harina de trigo', 0.42],
    ['Agua potable', 0.18],
    ['Azucar refinada', 0.14],
    ['Margarina vegetal', 0.10],
    ['Huevos', 2],
    ['Levadura instantanea', 14],
    ['Sal', 6],
    ['Cacao en polvo', 0.05],
    ['Chips de chocolate', 0.10]
  ],
  croissant: [
    ['Harina de trigo', 0.45],
    ['Agua potable', 0.20],
    ['Margarina para hojaldre', 0.25],
    ['Azucar refinada', 0.06],
    ['Huevos', 1],
    ['Levadura instantanea', 12],
    ['Sal', 8]
  ],
  corazones: [
    ['Harina de trigo', 0.45],
    ['Agua potable', 0.08],
    ['Margarina para hojaldre', 0.30],
    ['Azucar refinada', 0.15],
    ['Sal', 5]
  ],
  alfajores: [
    ['Harina de trigo', 0.35],
    ['Margarina vegetal', 0.25],
    ['Azucar refinada', 0.18],
    ['Huevos', 2]
  ],
  chipsChocolate: [
    ['Harina de trigo', 0.38],
    ['Margarina vegetal', 0.22],
    ['Azucar refinada', 0.18],
    ['Huevos', 2],
    ['Chips de chocolate', 0.15]
  ],
  avenaPasas: [
    ['Harina de trigo', 0.25],
    ['Avena en hojuelas', 0.25],
    ['Margarina vegetal', 0.20],
    ['Azucar refinada', 0.15],
    ['Huevos', 2],
    ['Uvas pasas deshidratadas', 0.12]
  ],
  crinkle: [
    ['Harina de trigo', 0.30],
    ['Margarina vegetal', 0.18],
    ['Azucar refinada', 0.22],
    ['Huevos', 2],
    ['Cacao en polvo', 0.12],
    ['Chips de chocolate', 0.08]
  ]
};

function perfilParaProducto(nombre) {
  const clave = nombre.toLowerCase();
  if (clave === 'bagel') return PERFILES.bagel;
  if (clave === 'pan trenza') return PERFILES.trenza;
  if (clave === 'pan molde') return PERFILES.molde;
  if (clave === 'rollo de canela') return PERFILES.rolloCanela;
  if (clave === 'pan de chocolate') return PERFILES.panChocolate;
  if (clave === 'croissant') return PERFILES.croissant;
  if (clave === 'corazones') return PERFILES.corazones;
  if (clave === 'alfajores') return PERFILES.alfajores;
  if (clave === 'chips de chocolate') return PERFILES.chipsChocolate;
  if (clave === 'avena con pasas') return PERFILES.avenaPasas;
  if (clave === 'crinkle de chocolate') return PERFILES.crinkle;
  return BASE_PAN;
}

function cantidadPorUnidad(pesoGramos, factor) {
  const cantidad = (Number(pesoGramos) / 1000) * Number(factor);
  return Math.max(Number(cantidad.toFixed(3)), 0.001);
}

function presentacionPara(unidad) {
  if (unidad === 'unidad') return 'caja';
  if (unidad === 'litros') return 'otro';
  return 'bulto';
}

function almacenamientoPara(nombre, tipo) {
  if (nombre === 'Huevos' || nombre.startsWith('Margarina')) {
    return 'Mantener refrigerado entre 2 y 8 C.';
  }
  if (tipo === 'liquido') return 'Conservar cerrado, protegido de contaminacion y luz directa.';
  return 'Conservar en un lugar fresco, seco y protegido de la humedad.';
}

async function prepararProveedores() {
  const ids = new Map();
  for (const proveedor of PROVEEDORES) {
    const { rows } = await poolPostgres.query(
      `INSERT INTO providers (
         nombre, nit, contacto, nombre_contacto, telefono, email,
         direccion, certificaciones, estado
       ) VALUES ($1,$2,$3,$3,$4,$5,$6,$7,'activo')
       ON CONFLICT (nit) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         contacto = EXCLUDED.contacto,
         nombre_contacto = EXCLUDED.nombre_contacto,
         telefono = EXCLUDED.telefono,
         email = EXCLUDED.email,
         direccion = EXCLUDED.direccion,
         certificaciones = EXCLUDED.certificaciones,
         estado = 'activo',
         updated_at = NOW()
       RETURNING id`,
      [
        proveedor.nombre,
        proveedor.nit,
        proveedor.contacto,
        proveedor.telefono,
        proveedor.email,
        proveedor.direccion,
        proveedor.certificaciones
      ]
    );
    ids.set(proveedor.clave, rows[0].id);
  }
  return ids;
}

async function prepararMateriasPrimas(proveedores) {
  const materias = new Map();
  for (const [nombre, descripcion, unidad, tipo, proveedor, stock] of MATERIAS_PRIMAS) {
    const proveedorId = proveedores.get(proveedor);
    const { rows } = await poolPostgres.query(
      `INSERT INTO raw_materials (
         nombre, descripcion, unidad_medida, unidad_medida_base,
         descripcion_unidad_personalizada, tipo_insumo,
         condiciones_almacenamiento, proveedor_id, is_active
       ) VALUES ($1,$2,$3,$3,'',$4,$5,$6,true)
       ON CONFLICT (nombre) DO UPDATE SET
         descripcion = EXCLUDED.descripcion,
         unidad_medida = EXCLUDED.unidad_medida,
         unidad_medida_base = EXCLUDED.unidad_medida_base,
         descripcion_unidad_personalizada = '',
         tipo_insumo = EXCLUDED.tipo_insumo,
         condiciones_almacenamiento = EXCLUDED.condiciones_almacenamiento,
         proveedor_id = EXCLUDED.proveedor_id,
         is_active = true,
         updated_at = NOW()
       RETURNING id, nombre, unidad_medida_base, proveedor_id`,
      [nombre, descripcion, unidad, tipo, almacenamientoPara(nombre, tipo), proveedorId]
    );
    await poolPostgres.query(
      `UPDATE inventario_materias_primas
       SET unidad_medida = $2,
           fecha_actualizacion = NOW()
       WHERE materia_prima_id = $1
         AND unidad_medida IS DISTINCT FROM $2`,
      [rows[0].id, unidad]
    );
    materias.set(nombre, { ...rows[0], stock });
  }
  return materias;
}

async function registrarRecepcionesPrueba(materias, usuario, actor) {
  const fechaVencimiento = new Date();
  fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
  const fechaVencimientoTexto = fechaVencimiento.toISOString().slice(0, 10);
  let creadas = 0;
  let existentes = 0;
  const advertencias = [];

  for (const [indice, materia] of [...materias.values()].entries()) {
    const lote = `PRUEBA-MP-${String(indice + 1).padStart(3, '0')}`;
    const consulta = await poolPostgres.query(
      'SELECT id FROM receptions WHERE numero_lote = $1 OR lote_proveedor = $1 LIMIT 1',
      [lote]
    );
    if (consulta.rows.length) {
      existentes += 1;
      continue;
    }

    const refrigerado = materia.nombre === 'Huevos' || materia.nombre.startsWith('Margarina');
    const datos = {
      fecha_recepcion: new Date().toISOString(),
      proveedor_id: Number(materia.proveedor_id),
      materia_prima_id: Number(materia.id),
      cantidad: Number(materia.stock),
      unidad_medida: materia.unidad_medida_base,
      presentacion: presentacionPara(materia.unidad_medida_base),
      numero_lote: lote,
      fecha_vencimiento: fechaVencimientoTexto,
      temperatura: refrigerado ? 5 : 20,
      observaciones: 'Recepcion controlada para pruebas funcionales del proyecto.',
      recibido_por: Number(usuario.id),
      estado_recepcion: 'aceptado',
      inspeccion_producto: {
        olor: true,
        color: true,
        textura: true,
        estado_empaque: true,
        certificado_calidad: true,
        observaciones_producto: 'Condiciones conformes para pruebas.',
        decision_producto: 'aceptado'
      },
      inspeccion_transporte: {
        condiciones_vehiculo: true,
        higiene_conductor: true,
        observaciones_transporte: 'Transporte conforme para pruebas.'
      }
    };

    try {
      await crearRecepcionService(datos, actor);
      creadas += 1;
    } catch (error) {
      const persistida = await poolPostgres.query(
        'SELECT id FROM receptions WHERE numero_lote = $1 OR lote_proveedor = $1 LIMIT 1',
        [lote]
      );
      if (!persistida.rows.length) throw error;
      creadas += 1;
      advertencias.push(`${materia.nombre}: recepcion guardada, evidencia pendiente (${error.message})`);
    }
  }

  return { creadas, existentes, advertencias };
}

async function prepararRecetas(materias) {
  const client = await poolPostgres.connect();
  const productosModificados = [];
  let asociaciones = 0;

  try {
    await client.query('BEGIN');
    const { rows: productos } = await client.query(
      `SELECT p.id, p.nombre, v.id AS variante_id, v.tamano_presentacion, v.peso_estimado_unidad
       FROM productos_fabricados p
       JOIN producto_variantes v ON v.producto_id = p.id
       WHERE p.estado = 'activo' AND v.estado = 'activo'
       ORDER BY p.id, v.id`
    );

    for (const fila of productos) {
      const perfil = perfilParaProducto(fila.nombre);
      await client.query(
        `DELETE FROM producto_variante_materia_prima
         WHERE variante_id = $1
           AND (
             observaciones LIKE 'Receta base provisional%'
             OR observaciones LIKE 'Receta provisional de prueba%'
           )`,
        [fila.variante_id]
      );

      for (const [nombreMateria, factor] of perfil) {
        const materia = materias.get(nombreMateria);
        if (!materia) throw new Error(`Materia prima no encontrada: ${nombreMateria}`);
        const cantidad = cantidadPorUnidad(fila.peso_estimado_unidad, factor);
        const existente = await client.query(
          `SELECT id
           FROM producto_variante_materia_prima
           WHERE variante_id = $1 AND materia_prima_id = $2
           LIMIT 1`,
          [fila.variante_id, materia.id]
        );
        if (existente.rows.length) continue;

        await client.query(
          `INSERT INTO producto_variante_materia_prima (
             variante_id, materia_prima_id, cantidad_requerida, observaciones
           ) VALUES ($1,$2,$3,$4)`,
          [
            fila.variante_id,
            materia.id,
            cantidad,
            'Receta provisional de prueba escalada por peso. Debe validarse con la formulacion oficial.'
          ]
        );
        asociaciones += 1;
      }
      productosModificados.push(Number(fila.id));
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    asociaciones,
    productos: [...new Set(productosModificados)]
  };
}

async function sincronizarRecetasBlockchain(productos, actor) {
  const resultados = [];
  for (const productoId of productos) {
    try {
      const resultado = await registrarVersionEventoCritico(
        'producto_fabricado_configurado',
        productoId,
        actor,
        'Carga provisional de materias primas para pruebas funcionales'
      );
      resultados.push({ productoId, estado: resultado?.estado || 'REGISTRADO' });
    } catch (error) {
      resultados.push({ productoId, estado: 'PENDIENTE', error: error.message });
    }
  }
  return resultados;
}

async function run() {
  const usuarioRes = await poolPostgres.query(
    `SELECT id, email
     FROM users
     WHERE email = 'admin@trazaap.local' AND is_active = true
     LIMIT 1`
  );
  const usuario = usuarioRes.rows[0];
  if (!usuario) throw new Error('No existe un administrador activo para registrar las recepciones de prueba.');

  const proveedores = await prepararProveedores();
  const materias = await prepararMateriasPrimas(proveedores);
  const recepciones = await registrarRecepcionesPrueba(materias, usuario, usuario.email);
  const recetas = await prepararRecetas(materias);
  const blockchain = await sincronizarRecetasBlockchain(recetas.productos, usuario.email);

  const pendientesBlockchain = blockchain.filter((item) => item.estado === 'PENDIENTE');
  console.log(JSON.stringify({
    materiasPrimas: materias.size,
    recepcionesCreadas: recepciones.creadas,
    recepcionesExistentes: recepciones.existentes,
    asociacionesReceta: recetas.asociaciones,
    productosActualizados: recetas.productos.length,
    advertenciasRecepciones: recepciones.advertencias,
    pendientesBlockchain
  }, null, 2));
}

run()
  .catch((error) => {
    console.error('No fue posible preparar las materias primas de prueba:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await poolPostgres.end();
  });
