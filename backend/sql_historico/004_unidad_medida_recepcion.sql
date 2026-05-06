ALTER TABLE receptions
  ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(30);

UPDATE receptions
SET unidad_medida = COALESCE(unidad_medida, 'unidad')
WHERE unidad_medida IS NULL;

ALTER TABLE receptions
  ALTER COLUMN unidad_medida SET NOT NULL;
