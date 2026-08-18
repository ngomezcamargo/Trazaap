BEGIN;

CREATE TABLE consecutivos_lote_fabrica (
  codigo_fabrica VARCHAR(12) NOT NULL,
  fecha_fabricacion DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  ultimo_consecutivo INTEGER NOT NULL DEFAULT 0 CHECK (ultimo_consecutivo BETWEEN 0 AND 9999),
  PRIMARY KEY (codigo_fabrica, fecha_fabricacion, fecha_vencimiento),
  CHECK (codigo_fabrica ~ '^[A-Z0-9]{2,12}$'),
  CHECK (fecha_vencimiento >= fecha_fabricacion)
);

COMMIT;
