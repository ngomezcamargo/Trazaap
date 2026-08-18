BEGIN;

ALTER TABLE devoluciones_no_conformidades
  DROP CONSTRAINT IF EXISTS devoluciones_no_conformidades_impacto_inventario_check;

UPDATE devoluciones_no_conformidades
SET impacto_inventario = 'retenido_pendiente_disposicion'
WHERE tipo_caso = 'devolucion_post_despacho'
  AND impacto_inventario = 'pendiente_definicion';

ALTER TABLE devoluciones_no_conformidades
  ALTER COLUMN impacto_inventario SET DEFAULT 'retenido_pendiente_disposicion';

ALTER TABLE devoluciones_no_conformidades
  ADD CONSTRAINT devoluciones_no_conformidades_impacto_inventario_check
  CHECK (impacto_inventario IN ('retenido_pendiente_disposicion', 'no_aplica'));

COMMIT;
