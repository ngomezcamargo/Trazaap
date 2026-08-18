CREATE TABLE IF NOT EXISTS actividades_saneamiento (
 id_actividad BIGSERIAL PRIMARY KEY,
 tipo VARCHAR(30) NOT NULL CHECK(tipo IN('limpieza','desinfeccion','control_plagas','manejo_residuos')),
 procedimiento TEXT NOT NULL,
 fecha_programada TIMESTAMPTZ NOT NULL,
 fecha_ejecucion TIMESTAMPTZ,
 responsable BIGINT REFERENCES users(id),
 resultado VARCHAR(120), observaciones TEXT,
 lista_chequeo JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(lista_chequeo)='array'),
 estado VARCHAR(20) NOT NULL DEFAULT 'programada' CHECK(estado IN('programada','ejecutada','cancelada')),
 creado_por BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((estado='ejecutada' AND fecha_ejecucion IS NOT NULL AND responsable IS NOT NULL AND resultado IS NOT NULL) OR estado<>'ejecutada')
);
CREATE INDEX IF NOT EXISTS idx_saneamiento_fecha ON actividades_saneamiento(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_saneamiento_tipo_estado ON actividades_saneamiento(tipo,estado);
