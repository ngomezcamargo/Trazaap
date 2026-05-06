CREATE TABLE IF NOT EXISTS productos_fabricados (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(140) NOT NULL,
  categoria VARCHAR(80) NOT NULL DEFAULT '',
  descripcion TEXT,
  tamano_presentacion VARCHAR(20) NOT NULL CHECK (tamano_presentacion IN ('grande', 'mediano', 'pequeno', 'personal', 'mini', 'cocktail')),
  vida_util_dias INTEGER NOT NULL CHECK (vida_util_dias > 0),
  condiciones_almacenamiento TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_materia_prima (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos_fabricados(id) ON DELETE CASCADE,
  materia_prima_id BIGINT NOT NULL REFERENCES raw_materials(id),
  cantidad_requerida NUMERIC(12,3) NOT NULL CHECK (cantidad_requerida > 0),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ordenes_produccion_productos
  ADD COLUMN IF NOT EXISTS producto_fabricado_id BIGINT REFERENCES productos_fabricados(id);

CREATE INDEX IF NOT EXISTS idx_producto_materia_producto ON producto_materia_prima(producto_id);
CREATE INDEX IF NOT EXISTS idx_producto_materia_materia ON producto_materia_prima(materia_prima_id);
