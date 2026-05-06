CREATE TABLE IF NOT EXISTS traceability_events (
  id UUID PRIMARY KEY,
  codigo_lote VARCHAR(100) NOT NULL,
  tipo_evento VARCHAR(40) NOT NULL CHECK (
    tipo_evento IN (
      'RECEPCION_MATERIA_PRIMA',
      'INICIO_FABRICACION',
      'CIERRE_FABRICACION',
      'CONTROL_CALIDAD',
      'ALMACENAMIENTO',
      'DESPACHO',
      'DEVOLUCION',
      'NO_CONFORMIDAD'
    )
  ),
  descripcion TEXT NOT NULL,
  responsable VARCHAR(120) NOT NULL,
  fecha_evento TIMESTAMPTZ NOT NULL,
  datos_evento JSONB NOT NULL DEFAULT '{}'::jsonb,
  hash_evento VARCHAR(64) NOT NULL,
  hash_anterior VARCHAR(64),
  fabric_tx_id VARCHAR(128),
  fabric_block_number BIGINT,
  fabric_status VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  fabric_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traceability_events_lot_date
  ON traceability_events (codigo_lote, fecha_evento ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_traceability_events_fabric_tx
  ON traceability_events (fabric_tx_id);
