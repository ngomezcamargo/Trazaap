-- RF05 - Distribucion y comercializacion con despachos parciales.
-- Conserva las liberaciones historicas y separa las nuevas salidas comerciales.

BEGIN;

ALTER TABLE liberacion_producto ALTER COLUMN numero_factura DROP NOT NULL;
ALTER TABLE liberacion_producto ALTER COLUMN conductor DROP NOT NULL;
ALTER TABLE liberacion_producto ALTER COLUMN placa_vehiculo DROP NOT NULL;
ALTER TABLE liberacion_producto ALTER COLUMN limpieza_vehiculo DROP NOT NULL;
ALTER TABLE liberacion_producto ALTER COLUMN documentacion_dotacion DROP NOT NULL;

ALTER TABLE almacenamientos_lote DROP CONSTRAINT IF EXISTS almacenamientos_lote_estado_check;
ALTER TABLE almacenamientos_lote
  ADD CONSTRAINT almacenamientos_lote_estado_check CHECK (
    estado IN (
      'almacenado', 'en_observacion', 'retenido', 'listo_para_liberacion',
      'liberado', 'despacho_parcial', 'despachado', 'rechazado'
    )
  );

ALTER TABLE inventario_producto_terminado
  ADD COLUMN IF NOT EXISTS unidades_liberadas INTEGER,
  ADD COLUMN IF NOT EXISTS unidades_reservadas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unidades_despachadas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_heredado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE inventario_producto_terminado
  DROP CONSTRAINT IF EXISTS inventario_producto_terminado_estado_check;

UPDATE inventario_producto_terminado ipt
SET unidades_liberadas = GREATEST(lp.unidades_empacadas + ipt.unidades_disponibles, 0),
    unidades_despachadas = GREATEST(lp.unidades_empacadas, 0),
    unidades_reservadas = 0,
    es_heredado = true
FROM liberacion_producto lp
WHERE lp.id_liberacion = ipt.id_liberacion
  AND ipt.unidades_liberadas IS NULL;

INSERT INTO inventario_producto_terminado (
  id_liberacion,
  producto,
  lote,
  unidades_liberadas,
  unidades_reservadas,
  unidades_despachadas,
  unidades_disponibles,
  fecha_vencimiento,
  estado,
  es_heredado
)
SELECT
  lp.id_liberacion,
  opp.producto,
  lp.lote_producido,
  lp.unidades_empacadas,
  0,
  lp.unidades_empacadas,
  0,
  lp.fecha_vencimiento,
  'despachado_total',
  true
FROM liberacion_producto lp
JOIN ordenes_produccion_productos opp ON opp.id = lp.id_producto
LEFT JOIN inventario_producto_terminado ipt ON ipt.id_liberacion = lp.id_liberacion
WHERE lp.estado_liberacion = 'aprobado'
  AND ipt.id_inventario IS NULL
ON CONFLICT (id_liberacion) DO NOTHING;

UPDATE inventario_producto_terminado
SET unidades_liberadas = COALESCE(unidades_liberadas, unidades_disponibles),
    estado = CASE
      WHEN estado = 'despachado' OR unidades_disponibles = 0 THEN 'despachado_total'
      WHEN unidades_despachadas > 0 THEN 'despacho_parcial'
      ELSE 'disponible'
    END;

ALTER TABLE inventario_producto_terminado
  ALTER COLUMN unidades_liberadas SET NOT NULL;
ALTER TABLE inventario_producto_terminado
  ADD CONSTRAINT inventario_producto_terminado_estado_check CHECK (
    estado IN ('disponible', 'despacho_parcial', 'despachado_total', 'retenido')
  );
ALTER TABLE inventario_producto_terminado
  DROP CONSTRAINT IF EXISTS inventario_producto_terminado_saldos_check;
ALTER TABLE inventario_producto_terminado
  ADD CONSTRAINT inventario_producto_terminado_saldos_check CHECK (
    unidades_liberadas >= 0
    AND unidades_reservadas >= 0
    AND unidades_despachadas >= 0
    AND unidades_disponibles >= 0
    AND unidades_liberadas = unidades_reservadas + unidades_despachadas + unidades_disponibles
  );

CREATE TABLE IF NOT EXISTS clientes (
  id_cliente BIGSERIAL PRIMARY KEY,
  nombre_razon_social VARCHAR(180) NOT NULL,
  nit_documento VARCHAR(50) NOT NULL UNIQUE,
  nombre_contacto VARCHAR(120) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  email VARCHAR(120),
  direccion VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS despachos_codigo_seq;

CREATE TABLE IF NOT EXISTS despachos (
  id_despacho BIGSERIAL PRIMARY KEY,
  codigo_despacho VARCHAR(40) NOT NULL UNIQUE,
  id_cliente BIGINT REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
  numero_factura VARCHAR(80) NOT NULL,
  fecha_despacho TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_entrega TIMESTAMPTZ,
  responsable_despacho BIGINT NOT NULL REFERENCES users(id),
  conductor VARCHAR(120),
  placa_vehiculo VARCHAR(20),
  temperatura_salida_c NUMERIC(6,2),
  temperatura_transporte_c NUMERIC(6,2),
  temperatura_entrega_c NUMERIC(6,2),
  limpieza_vehiculo VARCHAR(20) CHECK (limpieza_vehiculo IS NULL OR limpieza_vehiculo IN ('cumple', 'no_cumple')),
  documentacion_dotacion VARCHAR(20) CHECK (documentacion_dotacion IS NULL OR documentacion_dotacion IN ('cumple', 'no_cumple')),
  canal_distribucion VARCHAR(60),
  estado_despacho VARCHAR(40) NOT NULL DEFAULT 'pendiente_validacion_blockchain' CHECK (
    estado_despacho IN ('pendiente_validacion_blockchain', 'despachado', 'entregado', 'bloqueado', 'cancelado')
  ),
  motivo_bloqueo TEXT,
  observaciones TEXT,
  es_heredado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS despacho_detalle (
  id_detalle BIGSERIAL PRIMARY KEY,
  id_despacho BIGINT NOT NULL REFERENCES despachos(id_despacho) ON DELETE RESTRICT,
  id_inventario_producto_terminado BIGINT NOT NULL REFERENCES inventario_producto_terminado(id_inventario) ON DELETE RESTRICT,
  id_liberacion BIGINT NOT NULL REFERENCES liberacion_producto(id_liberacion) ON DELETE RESTRICT,
  cantidad_despachada INTEGER NOT NULL CHECK (cantidad_despachada > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_despacho, id_inventario_producto_terminado)
);

CREATE TABLE IF NOT EXISTS confirmaciones_entrega (
  id_confirmacion BIGSERIAL PRIMARY KEY,
  id_despacho BIGINT NOT NULL UNIQUE REFERENCES despachos(id_despacho) ON DELETE RESTRICT,
  receptor VARCHAR(160) NOT NULL,
  fecha_recepcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  temperatura_entrega_c NUMERIC(6,2) NOT NULL,
  observaciones TEXT,
  estado_confirmacion VARCHAR(30) NOT NULL DEFAULT 'pendiente_blockchain' CHECK (
    estado_confirmacion IN ('pendiente_blockchain', 'confirmada', 'bloqueada')
  ),
  motivo_bloqueo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Los eventos historicos de despacho usaron ids de liberacion como idEntidad.
-- Se reserva un rango nuevo para evitar reutilizar esas claves inmutables en Fabric.
SELECT setval(
  pg_get_serial_sequence('despachos', 'id_despacho'),
  GREATEST((SELECT COALESCE(MAX(id_despacho), 0) FROM despachos), 100000),
  true
);

INSERT INTO despachos (
  codigo_despacho,
  id_cliente,
  numero_factura,
  fecha_despacho,
  responsable_despacho,
  conductor,
  placa_vehiculo,
  temperatura_salida_c,
  temperatura_transporte_c,
  limpieza_vehiculo,
  documentacion_dotacion,
  canal_distribucion,
  estado_despacho,
  observaciones,
  es_heredado
)
SELECT
  'LEG-' || LPAD(lp.id_liberacion::TEXT, 8, '0'),
  NULL,
  COALESCE(NULLIF(BTRIM(lp.numero_factura), ''), 'SIN-FACTURA-' || lp.id_liberacion),
  lp.fecha_liberacion,
  lp.responsable_liberacion,
  NULLIF(BTRIM(lp.conductor), ''),
  NULLIF(BTRIM(lp.placa_vehiculo), ''),
  al.temperatura_salida_c,
  NULL,
  lp.limpieza_vehiculo,
  lp.documentacion_dotacion,
  NULL,
  'despachado',
  'Registro historico migrado desde liberacion de producto. Datos no disponibles se conservan como nulos.',
  true
FROM liberacion_producto lp
LEFT JOIN almacenamientos_lote al ON al.id_manufactura = lp.id_manufactura
WHERE lp.estado_liberacion = 'aprobado'
ON CONFLICT (codigo_despacho) DO NOTHING;

INSERT INTO despacho_detalle (
  id_despacho,
  id_inventario_producto_terminado,
  id_liberacion,
  cantidad_despachada
)
SELECT
  d.id_despacho,
  ipt.id_inventario,
  lp.id_liberacion,
  lp.unidades_empacadas
FROM liberacion_producto lp
JOIN inventario_producto_terminado ipt ON ipt.id_liberacion = lp.id_liberacion
JOIN despachos d ON d.codigo_despacho = 'LEG-' || LPAD(lp.id_liberacion::TEXT, 8, '0')
WHERE lp.estado_liberacion = 'aprobado'
ON CONFLICT (id_despacho, id_inventario_producto_terminado) DO NOTHING;

ALTER TABLE blockchain_outbox ALTER COLUMN operacion TYPE VARCHAR(40);
ALTER TABLE blockchain_outbox DROP CONSTRAINT IF EXISTS blockchain_outbox_operacion_check;
ALTER TABLE blockchain_outbox
  ADD CONSTRAINT blockchain_outbox_operacion_check CHECK (
    operacion IN (
      'registrar', 'versionar', 'inicializar_inventario_terminado',
      'registrar_despacho', 'confirmar_entrega'
    )
  );

CREATE INDEX IF NOT EXISTS idx_clientes_estado_nombre ON clientes(estado, nombre_razon_social);
CREATE INDEX IF NOT EXISTS idx_despachos_cliente_fecha ON despachos(id_cliente, fecha_despacho DESC);
CREATE INDEX IF NOT EXISTS idx_despachos_estado_fecha ON despachos(estado_despacho, fecha_despacho DESC);
CREATE INDEX IF NOT EXISTS idx_despacho_detalle_inventario ON despacho_detalle(id_inventario_producto_terminado, id_despacho);
CREATE INDEX IF NOT EXISTS idx_confirmaciones_estado ON confirmaciones_entrega(estado_confirmacion, fecha_recepcion);

COMMIT;
