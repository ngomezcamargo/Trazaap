CREATE TABLE IF NOT EXISTS devoluciones_no_conformidades (
  id_caso BIGSERIAL PRIMARY KEY,
  tipo_caso VARCHAR(30) NOT NULL CHECK (tipo_caso IN ('rechazo_pre_despacho', 'devolucion_post_despacho')),
  lote VARCHAR(100) NOT NULL,
  id_inventario BIGINT NOT NULL REFERENCES inventario_producto_terminado(id_inventario) ON DELETE RESTRICT,
  id_cliente BIGINT REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
  id_despacho BIGINT REFERENCES despachos(id_despacho) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha_registro TIMESTAMPTZ NOT NULL,
  motivo TEXT NOT NULL,
  accion VARCHAR(30) NOT NULL DEFAULT 'pendiente_decision'
    CHECK (accion IN ('pendiente_decision', 'retiro', 'reproceso', 'destruccion')),
  fecha_decision TIMESTAMPTZ,
  responsable BIGINT NOT NULL REFERENCES users(id),
  observaciones TEXT,
  impacto_inventario VARCHAR(30) NOT NULL DEFAULT 'pendiente_definicion'
    CHECK (impacto_inventario IN ('pendiente_definicion', 'no_aplica', 'aplicado_manualmente')),
  creado_por BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT devoluciones_tipo_referencias_check CHECK (
    (tipo_caso = 'devolucion_post_despacho' AND id_cliente IS NOT NULL AND id_despacho IS NOT NULL)
    OR (tipo_caso = 'rechazo_pre_despacho' AND id_despacho IS NULL)
  ),
  CONSTRAINT devoluciones_decision_fecha_check CHECK (
    (accion = 'pendiente_decision' AND fecha_decision IS NULL)
    OR (accion <> 'pendiente_decision' AND fecha_decision IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_devoluciones_lote_fecha
  ON devoluciones_no_conformidades (lote, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_devoluciones_cliente
  ON devoluciones_no_conformidades (id_cliente, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_devoluciones_accion
  ON devoluciones_no_conformidades (accion, fecha_registro DESC);
