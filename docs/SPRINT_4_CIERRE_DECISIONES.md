# Sprint 4 de cierre: decisiones y pendientes

Este documento no acredita requisitos ni reemplaza el Plan de Pruebas.

## Decisiones cerradas en el cierre funcional

- **RF03-B — formato adoptado.** El lote se genera exclusivamente en backend
  con el formato lógico `FAB-AAAAMMDD-AAAAMMDD-NNNN`: código de fábrica
  configurable, fecha de fabricación, fecha de vencimiento y consecutivo
  transaccional. Los lotes históricos se conservan sin reescritura.
- **RF13 — ambos estados adoptados.** El sistema distingue
  `proximo_vencimiento`, con umbral técnico configurable, y `vencido`. La
  persistencia evita duplicar una alerta del mismo tipo para el mismo lote.
- **RF16 — política segura adoptada.** Una devolución posterior al despacho
  queda retenida y pendiente de disposición. Nunca incrementa automáticamente
  el saldo disponible; cualquier reincorporación futura exige una decisión y
  controles de inocuidad adicionales.

## Pendientes de definición o validación externa

- **RF04 — BLOQUEADO POR REGLA FUNCIONAL/INGENIERO DE ALIMENTOS.** La frase
  "no mayor de 4 °C ±2 °C" no determina inequívocamente si se acepta 2–6 °C,
  un máximo absoluto, qué productos aplican ni la acción ante desvío. Se
  conserva el rango configurable por producto.
- **RF07/RF08 — BLOQUEADO POR VALIDACIÓN DEL INGENIERO DE ALIMENTOS.** Faltan
  rangos, referencias, unidades y reglas de conformidad aprobadas. El catálogo
  configurable y su gestión administrativa ya están implementados; no se
  cargaron valores ficticios.
- **RF14 — campos normativos finales:** multilote (máximo 50), consolidación
  y Excel están implementados; el mapeo definitivo del Artículo 22 requiere
  validación externa.
- **RF15 — listas de chequeo:** el motor acepta ítems extensibles, pero las
  plantillas finales requieren definición sanitaria.
- Los despachos parciales y saldos de la entrega base se conservaron; cualquier
- **GS1:** GTIN, GLN, SSCC y EPC reales son datos maestros pendientes de la
  empresa; el mapeo permanece configurable y las pruebas usan datos ficticios.

## PROPUESTA TÉCNICA RNF11

La línea base exige API REST JSON, OAuth 2.0 y eventos GS1 EPCIS 2.0. La base
técnica y su validación efímera quedaron implementadas: OAuth/OIDC mediante un
Authorization Server estándar, convivencia configurable con JWT legacy y una
capa EPCIS 2.0 separada del dominio operativo.

La transición mantiene OAuth como mecanismo objetivo y JWT legacy como opción
temporal explícita. RBAC continúa siendo una autorización única posterior a la
autenticación. EPCIS aporta adaptadores y endpoints de captura/consulta sin
reemplazar PostgreSQL ni Fabric.

`client_credentials` no se requiere actualmente: solo deberá revisarse si se
define un consumidor servidor-a-servidor real. El cierre de sesión revoca la
sesión/refresh token cuando el proveedor lo permite; un access token emitido
puede seguir válido hasta su expiración corta. No se añadió una blacklist
distribuida sin requisito explícito.

## Base de datos y despliegue futuro

Aplicar en un ambiente nuevo, en orden: `001_schema_actual.sql`,
`002_rf05_despachos_parciales.sql`, `003_rf02_equipos_fabricacion.sql`,
`004_rf03a_envasado_embalado.sql`, `005_rf15_saneamiento.sql`,
`006_rf16_devoluciones_no_conformidades.sql`,
`007_rf17_documentos_minio.sql`, `008_rf07_rf08_controles_calidad.sql`,
`009_rnf11_interoperabilidad.sql`, `010_rf03b_lote_automatico.sql`,
`011_rf16_politica_inventario.sql` y `012_rf13_alertas_vencimiento.sql`.

No se ejecutaron estas migraciones. Antes del despliegue debe existir respaldo,
validación en una base efímera y revisión de datos históricos.

## Fabric

Se añadieron los tipos `envasado_embalado` y `actividad_saneamiento` usando el
outbox actual. El chaincode genérico registra tipos de evento sin requerir por
ahora una nueva función, pero debe probarse su compatibilidad antes del ciclo
formal. Si la organización versiona el paquete por cambios de contratos/tests,
la sugerencia conservadora es siguiente versión menor y `sequence + 1`; los
valores concretos deben obtenerse del lifecycle desplegado, no asumirse aquí.

## Estado técnico Sprint 4.2

Quedaron implementados RF16, RF17/MinIO, la infraestructura configurable
RF07/RF08 y RF14 multilote/Excel. MinIO quedó como perfil de infraestructura y
no fue levantado. No se levantó Fabric ni se modificó el ambiente formal de QA.

Persisten como validaciones humanas: productos/rangos/reacciones de
refrigeración, rangos de calidad, plantillas de saneamiento, campos finales del
Artículo 22 e identificadores empresariales GS1.

## Dependencias pendientes

El frontend conserva un aviso alto asociado a Next 14: resolverlo requiere una
migración major a una línea soportada reciente. El backend conserva dos avisos
moderados por `uuid` transitivo de ExcelJS; npm solo propone una operación
breaking. Ninguno se forzó en este sprint.
