CREATE TABLE IF NOT EXISTS documentos_proveedor_materia (
  id_documento BIGSERIAL PRIMARY KEY,
  proveedor_id BIGINT REFERENCES providers(id) ON DELETE RESTRICT,
  materia_prima_id BIGINT REFERENCES raw_materials(id) ON DELETE RESTRICT,
  tipo_documental VARCHAR(40) NOT NULL CHECK (tipo_documental IN (
    'certificado_sanitario', 'ficha_tecnica', 'certificado_calidad', 'otro'
  )),
  nombre_original VARCHAR(255) NOT NULL,
  objeto_minio VARCHAR(500) NOT NULL UNIQUE,
  bucket VARCHAR(100) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes > 0),
  fecha_emision DATE,
  fecha_vencimiento DATE,
  observaciones TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  cargado_por BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT documentos_asociacion_exclusiva_check CHECK (
    (proveedor_id IS NOT NULL AND materia_prima_id IS NULL)
    OR (proveedor_id IS NULL AND materia_prima_id IS NOT NULL)
  ),
  CONSTRAINT documentos_vigencia_check CHECK (
    fecha_vencimiento IS NULL OR fecha_emision IS NULL OR fecha_vencimiento >= fecha_emision
  )
);
CREATE INDEX IF NOT EXISTS idx_documentos_proveedor ON documentos_proveedor_materia (proveedor_id, tipo_documental);
CREATE INDEX IF NOT EXISTS idx_documentos_materia ON documentos_proveedor_materia (materia_prima_id, tipo_documental);
CREATE INDEX IF NOT EXISTS idx_documentos_vencimiento ON documentos_proveedor_materia (fecha_vencimiento) WHERE estado = 'activo';
