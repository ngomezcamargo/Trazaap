ALTER TABLE raw_materials
  ADD COLUMN IF NOT EXISTS unidad_medida_base VARCHAR(40),
  ADD COLUMN IF NOT EXISTS descripcion_unidad_personalizada TEXT,
  ADD COLUMN IF NOT EXISTS tipo_insumo VARCHAR(20);

UPDATE raw_materials
SET unidad_medida_base = COALESCE(
  unidad_medida_base,
  CASE
    WHEN lower(trim(unidad_medida)) IN ('g', 'gramo', 'gramos') THEN 'gramos'
    WHEN lower(trim(unidad_medida)) IN ('kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos') THEN 'kilogramos'
    WHEN lower(trim(unidad_medida)) IN ('ml', 'mililitro', 'mililitros') THEN 'mililitros'
    WHEN lower(trim(unidad_medida)) IN ('l', 'lt', 'litro', 'litros') THEN 'litros'
    WHEN lower(trim(unidad_medida)) IN ('unidad', 'unidades', 'und') THEN 'unidad'
    WHEN lower(trim(unidad_medida)) IN ('docena', 'docenas') THEN 'docena'
    WHEN lower(trim(unidad_medida)) = 'caja' THEN 'caja'
    WHEN lower(trim(unidad_medida)) = 'paquete' THEN 'paquete'
    WHEN lower(trim(unidad_medida)) = 'bulto' THEN 'bulto'
    WHEN NULLIF(trim(unidad_medida), '') IS NULL THEN 'unidad'
    ELSE 'otro'
  END,
  'unidad'
)
WHERE unidad_medida_base IS NULL;

ALTER TABLE raw_materials
  ALTER COLUMN unidad_medida_base SET NOT NULL;

UPDATE raw_materials
SET descripcion_unidad_personalizada = COALESCE(descripcion_unidad_personalizada, NULLIF(trim(unidad_medida), ''))
WHERE unidad_medida_base = 'otro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_raw_materials_unidad_medida_base'
  ) THEN
    ALTER TABLE raw_materials
      ADD CONSTRAINT chk_raw_materials_unidad_medida_base
      CHECK (
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
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_raw_materials_tipo_insumo'
  ) THEN
    ALTER TABLE raw_materials
      ADD CONSTRAINT chk_raw_materials_tipo_insumo
      CHECK (tipo_insumo IS NULL OR tipo_insumo IN ('solido', 'liquido', 'unitario'));
  END IF;
END
$$;
