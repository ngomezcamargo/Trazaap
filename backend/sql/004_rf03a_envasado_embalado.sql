CREATE TABLE IF NOT EXISTS operaciones_envasado (
  id_envasado BIGSERIAL PRIMARY KEY,
  id_manufactura BIGINT NOT NULL REFERENCES registro_manufactura(id_manufactura) ON DELETE RESTRICT,
  lote VARCHAR(100) NOT NULL,
  fecha_operacion TIMESTAMPTZ NOT NULL,
  responsable BIGINT NOT NULL REFERENCES users(id),
  descripcion_operacion TEXT NOT NULL,
  resultado VARCHAR(120) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_manufactura)
);
CREATE INDEX IF NOT EXISTS idx_operaciones_envasado_lote ON operaciones_envasado (lote);
CREATE INDEX IF NOT EXISTS idx_operaciones_envasado_fecha ON operaciones_envasado (fecha_operacion);
