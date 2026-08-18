-- RF02: equipos utilizados durante el ciclo de fabricacion.
ALTER TABLE registro_manufactura
  ADD COLUMN IF NOT EXISTS equipos_utilizados TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_registro_manufactura_hora_inicio_fin
  ON registro_manufactura (hora_inicio, hora_fin);
