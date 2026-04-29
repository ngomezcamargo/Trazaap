CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL
);

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
  telefono VARCHAR(40) NOT NULL,
  email VARCHAR(120) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_materials (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) UNIQUE NOT NULL,
  descripcion TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receptions (
  id BIGSERIAL PRIMARY KEY,
  fecha_recepcion TIMESTAMPTZ NOT NULL,
  proveedor_id BIGINT NOT NULL REFERENCES providers(id),
  materia_prima_id BIGINT NOT NULL REFERENCES raw_materials(id),
  cantidad NUMERIC(12,3) NOT NULL,
  unidad_presentacion VARCHAR(50) NOT NULL,
  lote_proveedor VARCHAR(100) NOT NULL,
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
  olor VARCHAR(100) NOT NULL,
  color VARCHAR(100) NOT NULL,
  textura VARCHAR(100) NOT NULL,
  estado_empaque VARCHAR(100) NOT NULL,
  certificado_calidad BOOLEAN NOT NULL,
  inspeccion_vehiculo BOOLEAN NOT NULL,
  observaciones TEXT,
  decision_final VARCHAR(20) NOT NULL CHECK (decision_final IN ('aceptado', 'rechazado', 'retenido')),
  inspeccionado_por BIGINT NOT NULL REFERENCES users(id),
  inspeccionado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  producto VARCHAR(120) NOT NULL,
  codigo_producto VARCHAR(80),
  tamano_presentacion VARCHAR(20) NOT NULL CHECK (tamano_presentacion IN ('grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail')),
  cantidad_programada NUMERIC(12,3) NOT NULL CHECK (cantidad_programada > 0),
  cantidad_real_producida NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad_real_producida >= 0),
  unidad_medida VARCHAR(50) NOT NULL,
  lote_producto_terminado VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  tiempo_crecimiento_min INTEGER NOT NULL,
  temperatura_inmersion_agua NUMERIC(6,2),
  tiempo_inmersion_agua_seg INTEGER,
  temperatura_horneo NUMERIC(6,2) NOT NULL,
  tiempo_horneo_min INTEGER NOT NULL,
  lote_producto VARCHAR(100) NOT NULL,
  responsable_produccion BIGINT NOT NULL REFERENCES users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tiempo_crecimiento_min >= 0),
  CHECK (tiempo_horneo_min >= 0),
  CHECK (tiempo_inmersion_agua_seg IS NULL OR tiempo_inmersion_agua_seg >= 0)
);

CREATE TABLE IF NOT EXISTS ordenes_produccion_mojes (
  id BIGSERIAL PRIMARY KEY,
  orden_produccion_id BIGINT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  producto_receta VARCHAR(120) NOT NULL,
  cantidad_total_moje_gramos NUMERIC(12,3) NOT NULL CHECK (cantidad_total_moje_gramos > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordenes_produccion_mojes_ingredientes (
  id BIGSERIAL PRIMARY KEY,
  moje_id BIGINT NOT NULL REFERENCES ordenes_produccion_mojes(id) ON DELETE CASCADE,
  recepcion_id BIGINT NOT NULL REFERENCES receptions(id),
  ingrediente VARCHAR(120) NOT NULL,
  lote_ingrediente VARCHAR(100) NOT NULL,
  cantidad_gramos NUMERIC(12,3) NOT NULL CHECK (cantidad_gramos > 0),
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
CREATE INDEX IF NOT EXISTS idx_ordenes_produccion_fecha ON ordenes_produccion(fecha_produccion DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_materiales_orden ON ordenes_produccion_materias(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_lotes_producto_lote ON lotes_producto_terminado(lote_producto);
