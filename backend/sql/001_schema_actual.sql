-- Trazaap - esquema actual consolidado
-- Migracion unica oficial para crear la base de datos actual desde cero.
-- Reemplaza las migraciones historicas 001 a 011, archivadas en backend/sql_historico.

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL
);

INSERT INTO roles (name)
VALUES ('administrador'), ('gerente'), ('operario')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id BIGINT NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS providers (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  nit VARCHAR(40) UNIQUE NOT NULL,
  contacto VARCHAR(120) NOT NULL,
  nombre_contacto VARCHAR(120) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  email VARCHAR(120) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  certificaciones TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_materials (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) UNIQUE NOT NULL,
  descripcion TEXT,
  unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidad',
  unidad_medida_base VARCHAR(40) NOT NULL,
  descripcion_unidad_personalizada TEXT,
  tipo_insumo VARCHAR(20),
  condiciones_almacenamiento TEXT,
  proveedor_id BIGINT REFERENCES providers(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_raw_materials_unidad_medida_base CHECK (
    unidad_medida_base IN (
      'gramos',
      'kilogramos',
      'mililitros',
      'litros',
      'unidad',
      'docena',
      'caja',
      'paquete',
      'bulto',
      'otro'
    )
  ),
  CONSTRAINT chk_raw_materials_tipo_insumo CHECK (
    tipo_insumo IS NULL OR tipo_insumo IN ('solido', 'liquido', 'unitario')
  )
);

CREATE TABLE IF NOT EXISTS receptions (
  id BIGSERIAL PRIMARY KEY,
  fecha_recepcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proveedor_id BIGINT NOT NULL REFERENCES providers(id),
  materia_prima_id BIGINT NOT NULL REFERENCES raw_materials(id),
  cantidad NUMERIC(12,3) NOT NULL,
  unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidad',
  unidad_presentacion VARCHAR(50) NOT NULL,
  presentacion VARCHAR(20) DEFAULT 'otro',
  lote_proveedor VARCHAR(100) NOT NULL,
  numero_lote VARCHAR(100) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  temperatura_recepcion NUMERIC(6,2) NOT NULL,
  peso_recibido NUMERIC(12,3) NOT NULL,
  observaciones TEXT,
  recibido_por BIGINT NOT NULL REFERENCES users(id),
  estado_recepcion VARCHAR(20) NOT NULL CHECK (estado_recepcion IN ('aceptado', 'rechazado', 'retenido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reception_inspections (
  id BIGSERIAL PRIMARY KEY,
  reception_id BIGINT UNIQUE NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
  olor BOOLEAN NOT NULL,
  color BOOLEAN NOT NULL,
  textura BOOLEAN NOT NULL,
  estado_empaque BOOLEAN NOT NULL,
  certificado_calidad BOOLEAN NOT NULL,
  inspeccion_transporte BOOLEAN NOT NULL,
  observaciones TEXT,
  observaciones_producto TEXT,
  condiciones_vehiculo BOOLEAN,
  higiene_conductor BOOLEAN,
  observaciones_transporte TEXT,
  decision_final VARCHAR(20) NOT NULL CHECK (decision_final IN ('aceptado', 'rechazado', 'retenido')),
  inspeccionado_por BIGINT NOT NULL REFERENCES users(id),
  inspeccionado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reception_inspections DROP COLUMN IF EXISTS vehiculo;
ALTER TABLE reception_inspections DROP COLUMN IF EXISTS conductor;
ALTER TABLE reception_inspections DROP COLUMN IF EXISTS placa;
ALTER TABLE reception_inspections ADD COLUMN IF NOT EXISTS inspeccion_transporte BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE reception_inspections ADD COLUMN IF NOT EXISTS condiciones_vehiculo BOOLEAN;
ALTER TABLE reception_inspections ADD COLUMN IF NOT EXISTS higiene_conductor BOOLEAN;
ALTER TABLE reception_inspections ADD COLUMN IF NOT EXISTS observaciones_transporte TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reception_inspections'
      AND column_name = 'inspeccion_vehiculo'
  ) THEN
    UPDATE reception_inspections
    SET inspeccion_transporte = inspeccion_vehiculo
    WHERE inspeccion_transporte = false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reception_inspections'
      AND column_name = 'limpieza_vehiculo'
  ) THEN
    UPDATE reception_inspections
    SET condiciones_vehiculo = limpieza_vehiculo
    WHERE condiciones_vehiculo IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reception_inspections'
      AND column_name = 'transporte_vehiculo'
  ) THEN
    UPDATE reception_inspections
    SET higiene_conductor = transporte_vehiculo
    WHERE higiene_conductor IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reception_inspections'
      AND column_name = 'observaciones_vehiculo'
  ) THEN
    UPDATE reception_inspections
    SET observaciones_transporte = observaciones_vehiculo
    WHERE observaciones_transporte IS NULL;
  END IF;
END $$;

ALTER TABLE reception_inspections DROP COLUMN IF EXISTS inspeccion_vehiculo;
ALTER TABLE reception_inspections DROP COLUMN IF EXISTS limpieza_vehiculo;
ALTER TABLE reception_inspections DROP COLUMN IF EXISTS transporte_vehiculo;
ALTER TABLE reception_inspections DROP COLUMN IF EXISTS observaciones_vehiculo;

CREATE TABLE IF NOT EXISTS inventario_materias_primas (
  id BIGSERIAL PRIMARY KEY,
  materia_prima_id BIGINT NOT NULL UNIQUE REFERENCES raw_materials(id) ON DELETE CASCADE,
  cantidad_disponible NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidad_medida VARCHAR(50) NOT NULL,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id BIGSERIAL PRIMARY KEY,
  materia_prima_id BIGINT NOT NULL REFERENCES raw_materials(id),
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste')),
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  unidad_medida VARCHAR(50) NOT NULL,
  referencia_tipo VARCHAR(40) NOT NULL,
  referencia_id BIGINT,
  observaciones TEXT,
  creado_por VARCHAR(120),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trazabilidad_eventos (
  id BIGSERIAL PRIMARY KEY,
  recepcion_id BIGINT REFERENCES receptions(id) ON DELETE CASCADE,
  lote VARCHAR(100) NOT NULL,
  tipo_evento VARCHAR(80) NOT NULL,
  actor VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS eventos_blockchain;
DROP TABLE IF EXISTS traceability_events;

CREATE TABLE IF NOT EXISTS productos_fabricados (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(140) NOT NULL,
  categoria VARCHAR(80) NOT NULL DEFAULT '',
  descripcion TEXT,
  vida_util_dias INTEGER NOT NULL CHECK (vida_util_dias > 0),
  condiciones_almacenamiento TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  requiere_inmersion BOOLEAN NOT NULL DEFAULT false,
  tiempo_fermentacion_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  temperatura_fermentacion_c NUMERIC(10,2) NOT NULL DEFAULT 0,
  tiempo_horneado_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  temperatura_horneado_c NUMERIC(10,2) NOT NULL DEFAULT 0,
  tiempo_inmersion_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  temperatura_inmersion_c NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'productos_fabricados'
      AND column_name = 'tamano_presentacion'
  ) THEN
    FOR constraint_name IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'productos_fabricados'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%tamano_presentacion%'
    LOOP
      EXECUTE format('ALTER TABLE productos_fabricados DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    ALTER TABLE productos_fabricados
      ADD CONSTRAINT productos_fabricados_tamano_presentacion_check
      CHECK (tamano_presentacion IN ('grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail', 'unico', 'kilo', 'libra'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS producto_variantes (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos_fabricados(id) ON DELETE CASCADE,
  tamano_presentacion VARCHAR(20) NOT NULL CHECK (
    tamano_presentacion IN ('grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail')
  ),
  peso_estimado_unidad NUMERIC(12,3),
  unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidad',
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producto_id, tamano_presentacion)
);

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'producto_variantes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tamano_presentacion%'
  LOOP
    EXECUTE format('ALTER TABLE producto_variantes DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE producto_variantes
  ADD CONSTRAINT producto_variantes_tamano_presentacion_check
  CHECK (tamano_presentacion IN ('grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail', 'unico', 'kilo', 'libra'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'producto_variantes'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%(producto_id, tamano_presentacion)%'
  ) THEN
    ALTER TABLE producto_variantes
      ADD CONSTRAINT producto_variantes_producto_tamano_key
      UNIQUE (producto_id, tamano_presentacion);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS producto_variante_materia_prima (
  id BIGSERIAL PRIMARY KEY,
  variante_id BIGINT NOT NULL REFERENCES producto_variantes(id) ON DELETE CASCADE,
  materia_prima_id BIGINT NOT NULL REFERENCES raw_materials(id),
  cantidad_requerida NUMERIC(12,3) NOT NULL CHECK (cantidad_requerida > 0),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordenes_produccion (
  id BIGSERIAL PRIMARY KEY,
  fecha_produccion DATE NOT NULL,
  codigo_orden VARCHAR(80) UNIQUE,
  responsable_produccion BIGINT REFERENCES users(id),
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'lista_para_liberacion', 'finalizada', 'cancelada')),
  observaciones TEXT,
  creado_por BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ordenes_produccion_estado_check'
      AND conrelid = 'ordenes_produccion'::regclass
  ) THEN
    ALTER TABLE ordenes_produccion DROP CONSTRAINT ordenes_produccion_estado_check;
  END IF;
END $$;

ALTER TABLE ordenes_produccion ALTER COLUMN responsable_produccion DROP NOT NULL;
ALTER TABLE ordenes_produccion ALTER COLUMN estado TYPE VARCHAR(30);

ALTER TABLE ordenes_produccion
  ADD CONSTRAINT ordenes_produccion_estado_check
  CHECK (estado IN ('pendiente', 'en_proceso', 'lista_para_liberacion', 'finalizada', 'cancelada'));

CREATE TABLE IF NOT EXISTS ordenes_produccion_productos (
  id BIGSERIAL PRIMARY KEY,
  orden_produccion_id BIGINT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  producto_fabricado_id BIGINT REFERENCES productos_fabricados(id),
  producto_variante_id BIGINT REFERENCES producto_variantes(id),
  producto VARCHAR(120) NOT NULL,
  tamano_presentacion VARCHAR(20) NOT NULL CHECK (
    tamano_presentacion IN ('grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail')
  ),
  cantidad_programada NUMERIC(12,3) NOT NULL CHECK (cantidad_programada > 0),
  estado_manufactura VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado_manufactura IN ('pendiente', 'en_proceso', 'registrado', 'con_observaciones')),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ordenes_produccion_productos
  ADD COLUMN IF NOT EXISTS producto_variante_id BIGINT REFERENCES producto_variantes(id);
ALTER TABLE ordenes_produccion_productos
  ADD COLUMN IF NOT EXISTS estado_manufactura VARCHAR(30) NOT NULL DEFAULT 'pendiente';

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'ordenes_produccion_productos'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tamano_presentacion%'
  LOOP
    EXECUTE format('ALTER TABLE ordenes_produccion_productos DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE ordenes_produccion_productos
  ADD CONSTRAINT ordenes_produccion_productos_tamano_presentacion_check
  CHECK (tamano_presentacion IN ('grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail', 'unico', 'kilo', 'libra'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ordenes_produccion_productos_estado_manufactura_check'
      AND conrelid = 'ordenes_produccion_productos'::regclass
  ) THEN
    ALTER TABLE ordenes_produccion_productos DROP CONSTRAINT ordenes_produccion_productos_estado_manufactura_check;
  END IF;
END $$;

ALTER TABLE ordenes_produccion_productos
  ADD CONSTRAINT ordenes_produccion_productos_estado_manufactura_check
  CHECK (estado_manufactura IN ('pendiente', 'en_proceso', 'registrado', 'con_observaciones'));

CREATE TABLE IF NOT EXISTS ordenes_produccion_materias (
  id BIGSERIAL PRIMARY KEY,
  orden_produccion_id BIGINT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  orden_producto_id BIGINT REFERENCES ordenes_produccion_productos(id) ON DELETE CASCADE,
  recepcion_id BIGINT NOT NULL REFERENCES receptions(id),
  nombre_ingrediente VARCHAR(120) NOT NULL,
  cantidad_planificada NUMERIC(12,3) NOT NULL CHECK (cantidad_planificada > 0),
  cantidad_real NUMERIC(12,3) NOT NULL CHECK (cantidad_real > 0),
  unidad_medida VARCHAR(20) NOT NULL DEFAULT 'gramos',
  diferencia NUMERIC(12,3) GENERATED ALWAYS AS (cantidad_real - cantidad_planificada) STORED,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiempos_produccion (
  id BIGSERIAL PRIMARY KEY,
  orden_produccion_id BIGINT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  producto VARCHAR(120) NOT NULL,
  es_bagel BOOLEAN NOT NULL DEFAULT false,
  unidades_producidas INTEGER NOT NULL CHECK (unidades_producidas >= 0),
  temperatura_crecimiento NUMERIC(6,2) NOT NULL,
  tiempo_crecimiento_min INTEGER NOT NULL CHECK (tiempo_crecimiento_min >= 0),
  temperatura_inmersion_agua NUMERIC(6,2),
  tiempo_inmersion_agua_seg INTEGER CHECK (tiempo_inmersion_agua_seg IS NULL OR tiempo_inmersion_agua_seg >= 0),
  temperatura_horneo NUMERIC(6,2) NOT NULL,
  tiempo_horneo_min INTEGER NOT NULL CHECK (tiempo_horneo_min >= 0),
  lote_producto VARCHAR(100) NOT NULL,
  responsable_produccion BIGINT NOT NULL REFERENCES users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tiempos_produccion DROP COLUMN IF EXISTS numero_carro_escabiladero;

CREATE TABLE IF NOT EXISTS registro_manufactura (
  id_manufactura BIGSERIAL PRIMARY KEY,
  id_orden_produccion BIGINT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  id_producto BIGINT NOT NULL REFERENCES ordenes_produccion_productos(id) ON DELETE CASCADE,
  lote_producido VARCHAR(100) NOT NULL UNIQUE,
  unidades_producidas INTEGER NOT NULL CHECK (unidades_producidas >= 0),
  tiempo_real_fermentacion_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  temperatura_real_fermentacion_c NUMERIC(10,2) NOT NULL DEFAULT 0,
  tiempo_real_horneado_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  temperatura_real_horneado_c NUMERIC(10,2) NOT NULL DEFAULT 0,
  tiempo_real_inmersion_minutos NUMERIC(10,2),
  temperatura_real_inmersion_c NUMERIC(10,2),
  hora_inicio TIMESTAMPTZ NOT NULL,
  hora_fin TIMESTAMPTZ NOT NULL,
  observaciones TEXT,
  registrado_por_usuario_id BIGINT REFERENCES users(id),
  registrado_por VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_orden_produccion, id_producto)
);

ALTER TABLE registro_manufactura DROP COLUMN IF EXISTS carro_escabiladero;
ALTER TABLE registro_manufactura
  ADD COLUMN IF NOT EXISTS registrado_por_usuario_id BIGINT REFERENCES users(id);

DROP TABLE IF EXISTS lotes_producto_terminado CASCADE;

CREATE TABLE IF NOT EXISTS liberacion_producto (
  id_liberacion BIGSERIAL PRIMARY KEY,
  id_manufactura BIGINT UNIQUE NOT NULL REFERENCES registro_manufactura(id_manufactura) ON DELETE CASCADE,
  id_orden_produccion BIGINT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  id_producto BIGINT NOT NULL REFERENCES ordenes_produccion_productos(id) ON DELETE CASCADE,
  lote_producido VARCHAR(100) NOT NULL UNIQUE,
  fecha_liberacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsable_liberacion BIGINT NOT NULL REFERENCES users(id),
  tipo_empaque VARCHAR(80) NOT NULL,
  numero_factura VARCHAR(80) NOT NULL,
  conductor VARCHAR(120) NOT NULL,
  placa_vehiculo VARCHAR(20) NOT NULL,
  limpieza_vehiculo VARCHAR(20) NOT NULL CHECK (limpieza_vehiculo IN ('cumple', 'no_cumple')),
  documentacion_dotacion VARCHAR(20) NOT NULL CHECK (documentacion_dotacion IN ('cumple', 'no_cumple')),
  unidades_producidas INTEGER NOT NULL CHECK (unidades_producidas >= 0),
  unidades_empacadas INTEGER NOT NULL CHECK (unidades_empacadas > 0),
  peso_neto NUMERIC(12,3) NOT NULL CHECK (peso_neto > 0),
  fecha_vencimiento DATE NOT NULL,
  etiqueta_verificada BOOLEAN NOT NULL,
  verificacion_envase BOOLEAN NOT NULL DEFAULT true,
  lote_visible BOOLEAN NOT NULL,
  fecha_vencimiento_visible BOOLEAN NOT NULL,
  empaque_conforme BOOLEAN NOT NULL,
  producto_en_buen_estado BOOLEAN NOT NULL,
  estado_liberacion VARCHAR(20) NOT NULL CHECK (estado_liberacion IN ('aprobado', 'retenido', 'rechazado')),
  motivo_retencion TEXT,
  motivo_rechazo TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE liberacion_producto ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(80);
ALTER TABLE liberacion_producto ADD COLUMN IF NOT EXISTS conductor VARCHAR(120);
ALTER TABLE liberacion_producto ADD COLUMN IF NOT EXISTS placa_vehiculo VARCHAR(20);
ALTER TABLE liberacion_producto ADD COLUMN IF NOT EXISTS limpieza_vehiculo VARCHAR(20);
ALTER TABLE liberacion_producto ADD COLUMN IF NOT EXISTS documentacion_dotacion VARCHAR(20);
ALTER TABLE liberacion_producto ADD COLUMN IF NOT EXISTS verificacion_envase BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS inventario_producto_terminado (
  id_inventario BIGSERIAL PRIMARY KEY,
  id_liberacion BIGINT UNIQUE NOT NULL REFERENCES liberacion_producto(id_liberacion) ON DELETE CASCADE,
  producto VARCHAR(120) NOT NULL,
  lote VARCHAR(100) UNIQUE NOT NULL,
  unidades_disponibles INTEGER NOT NULL CHECK (unidades_disponibles >= 0),
  fecha_vencimiento DATE NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'reservado', 'despachado', 'retenido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS liberaciones_producto CASCADE;

CREATE INDEX IF NOT EXISTS idx_receptions_lote ON receptions(lote_proveedor);
CREATE INDEX IF NOT EXISTS idx_receptions_proveedor ON receptions(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_eventos_lote ON trazabilidad_eventos(lote, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_inventario_materia_prima ON inventario_materias_primas(materia_prima_id);
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_materia ON inventario_movimientos(materia_prima_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_producto_variantes_producto ON producto_variantes(producto_id);
CREATE INDEX IF NOT EXISTS idx_producto_variante_materia_variante ON producto_variante_materia_prima(variante_id);
CREATE INDEX IF NOT EXISTS idx_producto_variante_materia_materia ON producto_variante_materia_prima(materia_prima_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_produccion_fecha ON ordenes_produccion(fecha_produccion DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_materiales_orden ON ordenes_produccion_materias(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_registro_manufactura_lote ON registro_manufactura(lote_producido);
CREATE INDEX IF NOT EXISTS idx_registro_manufactura_orden ON registro_manufactura(id_orden_produccion);
CREATE INDEX IF NOT EXISTS idx_liberacion_producto_lote ON liberacion_producto(lote_producido);
CREATE INDEX IF NOT EXISTS idx_liberacion_producto_estado ON liberacion_producto(estado_liberacion);
CREATE INDEX IF NOT EXISTS idx_inventario_producto_terminado_lote ON inventario_producto_terminado(lote);

WITH recepciones_pendientes AS (
  SELECT
    r.id,
    r.materia_prima_id,
    r.cantidad,
    COALESCE(r.unidad_medida, rm.unidad_medida_base, rm.unidad_medida, 'unidad') AS unidad_medida,
    COALESCE(r.numero_lote, r.lote_proveedor) AS lote,
    r.recibido_por
  FROM receptions r
  JOIN raw_materials rm ON rm.id = r.materia_prima_id
  LEFT JOIN inventario_movimientos im
    ON im.referencia_tipo = 'recepcion'
   AND im.referencia_id = r.id
   AND im.tipo_movimiento = 'entrada'
  WHERE r.estado_recepcion = 'aceptado'
    AND im.id IS NULL
),
totales AS (
  SELECT materia_prima_id, unidad_medida, SUM(cantidad) AS cantidad_total
  FROM recepciones_pendientes
  GROUP BY materia_prima_id, unidad_medida
)
INSERT INTO inventario_materias_primas (materia_prima_id, cantidad_disponible, unidad_medida, fecha_actualizacion)
SELECT materia_prima_id, cantidad_total, unidad_medida, NOW()
FROM totales
ON CONFLICT (materia_prima_id)
DO UPDATE SET
  cantidad_disponible = inventario_materias_primas.cantidad_disponible + EXCLUDED.cantidad_disponible,
  unidad_medida = EXCLUDED.unidad_medida,
  fecha_actualizacion = NOW();

INSERT INTO inventario_movimientos (
  materia_prima_id,
  tipo_movimiento,
  cantidad,
  unidad_medida,
  referencia_tipo,
  referencia_id,
  observaciones,
  creado_por
)
SELECT
  r.materia_prima_id,
  'entrada',
  r.cantidad,
  COALESCE(r.unidad_medida, rm.unidad_medida_base, rm.unidad_medida, 'unidad'),
  'recepcion',
  r.id,
  'Entrada historica por recepcion ' || COALESCE(r.numero_lote, r.lote_proveedor),
  CAST(r.recibido_por AS text)
FROM receptions r
JOIN raw_materials rm ON rm.id = r.materia_prima_id
WHERE r.estado_recepcion = 'aceptado'
  AND NOT EXISTS (
    SELECT 1
    FROM inventario_movimientos im
    WHERE im.referencia_tipo = 'recepcion'
      AND im.referencia_id = r.id
      AND im.tipo_movimiento = 'entrada'
  );
