CREATE TABLE IF NOT EXISTS definiciones_control_calidad (
  id_definicion BIGSERIAL PRIMARY KEY,
  categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('haccp_proceso','fisico','quimico','microbiologico','organoleptico','producto_terminado')),
  parametro VARCHAR(160) NOT NULL,
  unidad VARCHAR(60),
  referencia TEXT,
  limite_minimo NUMERIC(16,4),
  limite_maximo NUMERIC(16,4),
  valor_esperado_texto VARCHAR(300),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (limite_minimo IS NULL OR limite_maximo IS NULL OR limite_minimo <= limite_maximo),
  CHECK (limite_minimo IS NOT NULL OR limite_maximo IS NOT NULL OR valor_esperado_texto IS NOT NULL OR referencia IS NOT NULL),
  UNIQUE (categoria, parametro, unidad)
);

CREATE TABLE IF NOT EXISTS controles_calidad_lote (
  id_control BIGSERIAL PRIMARY KEY,
  id_manufactura BIGINT NOT NULL REFERENCES registro_manufactura(id_manufactura) ON DELETE RESTRICT,
  lote VARCHAR(100) NOT NULL,
  id_definicion BIGINT NOT NULL REFERENCES definiciones_control_calidad(id_definicion) ON DELETE RESTRICT,
  resultado_numerico NUMERIC(16,4),
  resultado_texto VARCHAR(500),
  conformidad VARCHAR(20) NOT NULL CHECK (conformidad IN ('conforme','no_conforme','no_determinado')),
  genera_alerta BOOLEAN NOT NULL DEFAULT false,
  decision_lote VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (decision_lote IN ('pendiente','liberacion','retencion','rechazo')),
  responsable BIGINT NOT NULL REFERENCES users(id), fecha_control TIMESTAMPTZ NOT NULL,
  observaciones TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((resultado_numerico IS NOT NULL AND resultado_texto IS NULL) OR (resultado_numerico IS NULL AND resultado_texto IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_definiciones_control_categoria ON definiciones_control_calidad(categoria, activo);
CREATE INDEX IF NOT EXISTS idx_controles_calidad_lote ON controles_calidad_lote(lote, fecha_control DESC);
CREATE INDEX IF NOT EXISTS idx_controles_calidad_alerta ON controles_calidad_lote(genera_alerta, fecha_control DESC) WHERE genera_alerta;
