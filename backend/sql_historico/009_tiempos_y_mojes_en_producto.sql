ALTER TABLE productos_fabricados
  ADD COLUMN IF NOT EXISTS requiere_inmersion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maneja_moje BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiempo_fermentacion_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperatura_fermentacion_c NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiempo_horneado_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperatura_horneado_c NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiempo_inmersion_minutos NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperatura_inmersion_c NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS producto_mojes (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos_fabricados(id) ON DELETE CASCADE,
  nombre_moje VARCHAR(120) NOT NULL,
  cantidad_base NUMERIC(12,3) NOT NULL CHECK (cantidad_base > 0),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producto_mojes_producto ON producto_mojes(producto_id);
