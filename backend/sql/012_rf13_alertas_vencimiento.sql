BEGIN;

CREATE TABLE alertas_vencimiento_lote (
  id_alerta BIGSERIAL PRIMARY KEY,
  id_inventario BIGINT NOT NULL REFERENCES inventario_producto_terminado(id_inventario) ON DELETE CASCADE,
  tipo_alerta VARCHAR(30) NOT NULL CHECK (tipo_alerta IN ('proximo_vencimiento', 'vencido')),
  fecha_vencimiento DATE NOT NULL,
  dias_anticipacion INTEGER CHECK (dias_anticipacion IS NULL OR dias_anticipacion >= 0),
  evidencia_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (evidencia_estado IN ('pendiente', 'registrada', 'error')),
  evidencia_error TEXT,
  detectada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidencia_at TIMESTAMPTZ,
  UNIQUE (id_inventario, tipo_alerta)
);

CREATE INDEX idx_alertas_vencimiento_tipo_fecha
  ON alertas_vencimiento_lote(tipo_alerta, fecha_vencimiento);

CREATE INDEX idx_alertas_vencimiento_evidencia
  ON alertas_vencimiento_lote(evidencia_estado, detectada_at)
  WHERE evidencia_estado <> 'registrada';

COMMIT;
