DROP TABLE IF EXISTS producto_mojes CASCADE;
DROP TABLE IF EXISTS ordenes_produccion_mojes_ingredientes CASCADE;
DROP TABLE IF EXISTS ordenes_produccion_mojes CASCADE;

ALTER TABLE productos_fabricados
  DROP COLUMN IF EXISTS maneja_moje;

ALTER TABLE ordenes_produccion_productos
  DROP COLUMN IF EXISTS cantidad_real_producida,
  DROP COLUMN IF EXISTS unidad_medida,
  DROP COLUMN IF EXISTS lote_producto_terminado,
  DROP COLUMN IF EXISTS codigo_producto;
