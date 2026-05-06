ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS nombre_contacto VARCHAR(120),
  ADD COLUMN IF NOT EXISTS certificaciones TEXT;

UPDATE providers
SET nombre_contacto = COALESCE(nombre_contacto, contacto)
WHERE nombre_contacto IS NULL;

ALTER TABLE providers
  ALTER COLUMN nombre_contacto SET NOT NULL;

ALTER TABLE raw_materials
  ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidad',
  ADD COLUMN IF NOT EXISTS condiciones_almacenamiento TEXT,
  ADD COLUMN IF NOT EXISTS proveedor_id BIGINT REFERENCES providers(id);

ALTER TABLE receptions
  ADD COLUMN IF NOT EXISTS presentacion VARCHAR(20) DEFAULT 'otro',
  ADD COLUMN IF NOT EXISTS numero_lote VARCHAR(100),
  ALTER COLUMN fecha_recepcion SET DEFAULT NOW();

UPDATE receptions
SET numero_lote = COALESCE(numero_lote, lote_proveedor)
WHERE numero_lote IS NULL;

ALTER TABLE receptions
  ALTER COLUMN numero_lote SET NOT NULL;

ALTER TABLE reception_inspections
  ADD COLUMN IF NOT EXISTS observaciones_producto TEXT,
  ADD COLUMN IF NOT EXISTS vehiculo VARCHAR(120),
  ADD COLUMN IF NOT EXISTS conductor VARCHAR(120),
  ADD COLUMN IF NOT EXISTS placa VARCHAR(20),
  ADD COLUMN IF NOT EXISTS limpieza_vehiculo BOOLEAN,
  ADD COLUMN IF NOT EXISTS transporte_vehiculo BOOLEAN,
  ADD COLUMN IF NOT EXISTS observaciones_vehiculo TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reception_inspections'
      AND column_name = 'olor'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE reception_inspections
      ALTER COLUMN olor TYPE BOOLEAN USING (
        CASE WHEN lower(trim(olor)) IN ('si', 'true', '1', 'ok', 'cumple', 'aprobado', 'conforme') THEN true ELSE false END
      )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reception_inspections'
      AND column_name = 'color'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE reception_inspections
      ALTER COLUMN color TYPE BOOLEAN USING (
        CASE WHEN lower(trim(color)) IN ('si', 'true', '1', 'ok', 'cumple', 'aprobado', 'conforme') THEN true ELSE false END
      )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reception_inspections'
      AND column_name = 'textura'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE reception_inspections
      ALTER COLUMN textura TYPE BOOLEAN USING (
        CASE WHEN lower(trim(textura)) IN ('si', 'true', '1', 'ok', 'cumple', 'aprobado', 'conforme') THEN true ELSE false END
      )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reception_inspections'
      AND column_name = 'estado_empaque'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE reception_inspections
      ALTER COLUMN estado_empaque TYPE BOOLEAN USING (
        CASE WHEN lower(trim(estado_empaque)) IN ('si', 'true', '1', 'ok', 'cumple', 'aprobado', 'conforme') THEN true ELSE false END
      )
    $sql$;
  END IF;
END
$$;

UPDATE reception_inspections
SET observaciones_producto = COALESCE(observaciones_producto, observaciones)
WHERE observaciones_producto IS NULL;
