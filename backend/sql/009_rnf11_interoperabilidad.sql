BEGIN;

CREATE TABLE oauth_identities (
  id BIGSERIAL PRIMARY KEY,
  issuer VARCHAR(500) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  UNIQUE (issuer, subject),
  UNIQUE (issuer, user_id)
);

CREATE INDEX idx_oauth_identities_user ON oauth_identities(user_id);

CREATE TABLE epcis_identificadores_lote (
  id BIGSERIAL PRIMARY KEY,
  lote VARCHAR(100) NOT NULL UNIQUE,
  epc_class_uri VARCHAR(500) NOT NULL,
  producto_uri VARCHAR(500),
  read_point_uri VARCHAR(500),
  biz_location_uri VARCHAR(500),
  actualizado_por BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (epc_class_uri ~ '^urn:epc:class:|^https?://'),
  CHECK (producto_uri IS NULL OR producto_uri ~ '^urn:epc:idpat:|^https?://'),
  CHECK (read_point_uri IS NULL OR read_point_uri ~ '^urn:epc:id:sgln:|^https?://'),
  CHECK (biz_location_uri IS NULL OR biz_location_uri ~ '^urn:epc:id:sgln:|^https?://')
);

CREATE TABLE auditoria_interoperabilidad (
  id BIGSERIAL PRIMARY KEY,
  direccion VARCHAR(20) NOT NULL CHECK (direccion IN ('capture', 'query')),
  estandar VARCHAR(30) NOT NULL DEFAULT 'GS1_EPCIS_2.0',
  actor VARCHAR(255) NOT NULL,
  cantidad_eventos INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_eventos >= 0),
  resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('aceptado', 'rechazado', 'generado')),
  codigo_error VARCHAR(100),
  metadatos JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadatos) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_interoperabilidad_fecha ON auditoria_interoperabilidad(created_at DESC);
CREATE INDEX idx_auditoria_interoperabilidad_actor ON auditoria_interoperabilidad(actor, created_at DESC);

COMMIT;
