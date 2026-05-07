-- Trazaap - esquema actual consolidado
-- Generado a partir de las migraciones 001 a 011.
-- Este archivo es un snapshot para documentacion o recreacion manual.
-- No esta dentro de backend/sql para no ser ejecutado automaticamente por npm run migrate.

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

CREATE TABLE IF NOT EXISTS eventos_blockchain (
  id BIGSERIAL PRIMARY KEY,
  tipo_evento VARCHAR(100) NOT NULL,
  lote VARCHAR(100) NOT NULL,
  hash VARCHAR(255) NOT NULL,
  fecha_evento TIMESTAMPTZ NOT NULL,
  usuario VARCHAR(255) NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE eventos_blockchain DROP COLUMN IF EXISTS rf_id;
ALTER TABLE eventos_blockchain DROP COLUMN IF EXISTS fabric_estado;
ALTER TABLE eventos_blockchain DROP COLUMN IF EXISTS fabric_tx_id;
ALTER TABLE eventos_blockchain DROP COLUMN IF EXISTS fabric_resultado;
ALTER TABLE eventos_blockchain DROP COLUMN IF EXISTS fabric_error;

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
  responsable_produccion BIGINT NOT NULL REFERENCES users(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'finalizada', 'cancelada')),
  observaciones TEXT,
  creado_por BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ordenes_produccion_productos
  ADD COLUMN IF NOT EXISTS producto_variante_id BIGINT REFERENCES producto_variantes(id);

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
  numero_carro_escabiladero VARCHAR(30) NOT NULL,
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

CREATE TABLE IF NOT EXISTS lotes_producto_terminado (
  id BIGSERIAL PRIMARY KEY,
  orden_produccion_id BIGINT UNIQUE NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  lote_producto VARCHAR(100) UNIQUE NOT NULL,
  peso_total NUMERIC(12,3) NOT NULL CHECK (peso_total > 0),
  fecha_produccion DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liberaciones_producto (
  id BIGSERIAL PRIMARY KEY,
  lote_producto_id BIGINT UNIQUE NOT NULL REFERENCES lotes_producto_terminado(id) ON DELETE CASCADE,
  producto VARCHAR(120) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  unidades_liberadas INTEGER NOT NULL CHECK (unidades_liberadas >= 0),
  peso_neto NUMERIC(12,3) NOT NULL CHECK (peso_neto > 0),
  verificacion_etiqueta BOOLEAN NOT NULL,
  verificacion_envase BOOLEAN NOT NULL,
  numero_factura VARCHAR(80),
  cliente_destino VARCHAR(150),
  conductor VARCHAR(120),
  placa_vehiculo VARCHAR(20),
  limpieza_vehiculo VARCHAR(20) NOT NULL CHECK (limpieza_vehiculo IN ('cumple', 'no_cumple')),
  documentacion_dotacion VARCHAR(20) NOT NULL CHECK (documentacion_dotacion IN ('cumple', 'no_cumple')),
  responsable_liberacion BIGINT NOT NULL REFERENCES users(id),
  estado_liberacion VARCHAR(20) NOT NULL CHECK (estado_liberacion IN ('liberado', 'retenido', 'rechazado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receptions_lote ON receptions(lote_proveedor);
CREATE INDEX IF NOT EXISTS idx_receptions_proveedor ON receptions(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_eventos_lote ON trazabilidad_eventos(lote, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_blockchain_lote ON eventos_blockchain(lote, fecha_evento DESC);
CREATE INDEX IF NOT EXISTS idx_inventario_materia_prima ON inventario_materias_primas(materia_prima_id);
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_materia ON inventario_movimientos(materia_prima_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_producto_variantes_producto ON producto_variantes(producto_id);
CREATE INDEX IF NOT EXISTS idx_producto_variante_materia_variante ON producto_variante_materia_prima(variante_id);
CREATE INDEX IF NOT EXISTS idx_producto_variante_materia_materia ON producto_variante_materia_prima(materia_prima_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_produccion_fecha ON ordenes_produccion(fecha_produccion DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_materiales_orden ON ordenes_produccion_materias(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_lotes_producto_lote ON lotes_producto_terminado(lote_producto);

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
