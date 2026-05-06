CREATE TABLE IF NOT EXISTS inventario_materias_primas (
  id BIGSERIAL PRIMARY KEY,
  materia_prima_id BIGINT NOT NULL UNIQUE REFERENCES raw_materials(id) ON DELETE CASCADE,
  cantidad_disponible NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidad_medida VARCHAR(50) NOT NULL,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventario_materia_prima ON inventario_materias_primas(materia_prima_id);
