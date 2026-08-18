# Sprint 4 de cierre: decisiones y pendientes

Este documento no acredita requisitos ni reemplaza el Plan de Pruebas.

## Bloqueos funcionales

- **RF03-B — BLOQUEADO POR DEFINICIÓN DEL FORMATO OFICIAL DEL LOTE.** El
  generador actual es transaccional y único (`PREFIJO-AAAAMMDD-CONSECUTIVO`),
  pero no incorpora literalmente la fecha de vencimiento ni un código de
  fábrica diferenciado. Cambiarlo requiere aprobar formato, longitud,
  compatibilidad y estrategia para lotes históricos.
- **RF04 — BLOQUEADO POR REGLA FUNCIONAL/INGENIERO DE ALIMENTOS.** La frase
  "no mayor de 4 °C ±2 °C" no determina inequívocamente si se acepta 2–6 °C,
  un máximo absoluto, qué productos aplican ni la acción ante desvío. Se
  conserva el rango configurable por producto.
- **RF13 — BLOQUEADO POR DEFINICIÓN: ALERTA PREVIA VS LOTE YA VENCIDO.** El
  bloqueo de despacho vencido existente se conserva; no se inventó una
  anticipación.
- **RF07/RF08 — BLOQUEADO POR VALIDACIÓN DEL INGENIERO DE ALIMENTOS.** Faltan
  rangos, referencias, unidades y reglas de conformidad aprobadas. Debe
  implementarse catálogo configurable antes de cargar valores.
- **RF14 — campos normativos finales:** multilote (máximo 50), consolidación
  y Excel están implementados; el mapeo definitivo del Artículo 22 requiere
  validación externa.
- **RF15 — listas de chequeo:** el motor acepta ítems extensibles, pero las
  plantillas finales requieren definición sanitaria.
- **RF16 — inventario de devoluciones:** el registro y las decisiones están
  implementados, pero no está definida la política de reincorporación; no se
  creó una mutación de saldos especulativa.
- Los despachos parciales y saldos de la entrega base se conservaron; cualquier
  cambio de reservas o reincorporación queda sujeto a política aprobada.

## PROPUESTA TÉCNICA RNF11

La línea base exige API REST JSON, OAuth 2.0 y eventos GS1 EPCIS 2.0. Hoy la
API REST responde JSON y usa JWT propio; no existe Authorization Server ni
representación EPCIS.

La implementación separada debería incorporar un proveedor OAuth/OIDC
estándar, validación de access tokens por middleware, scopes equivalentes al
RBAC interno, registro de clientes y rotación/revocación. Para EPCIS debe
añadir un adaptador de eventos y endpoints de captura/consulta compatibles,
sin reemplazar PostgreSQL ni Fabric. Conviene mapear primero cada evento
Trazaap a EPCIS (identificadores, bizStep, disposition, readPoint y bizLocation)
y versionar el contrato.

Alternativas: proveedor de identidad administrado o Keycloak/autohospedado;
adaptador EPCIS interno o componente compatible mantenido. La migración debe
permitir convivencia temporal JWT/OAuth, clientes piloto, scopes auditados y
retiro posterior del JWT interno. Riesgos: ruptura de clientes, identidad de
actores históricos, semántica GS1 incompleta, gestión de claves y mayor carga
operativa. Complejidad relativa: **alta**, en un bloque arquitectónico propio.

## Base de datos y despliegue futuro

Aplicar en un ambiente nuevo, en orden: `001_schema_actual.sql`,
`002_rf05_despachos_parciales.sql`, `003_rf02_equipos_fabricacion.sql`,
`004_rf03a_envasado_embalado.sql`, `005_rf15_saneamiento.sql`,
`006_rf16_devoluciones_no_conformidades.sql`,
`007_rf17_documentos_minio.sql` y `008_rf07_rf08_controles_calidad.sql`.

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

Persisten como validaciones humanas: política de reincorporación de
devoluciones, rangos de calidad, plantillas de saneamiento y campos finales del
Artículo 22.

## Dependencias pendientes

El frontend conserva un aviso alto asociado a Next 14: resolverlo requiere una
migración major a una línea soportada reciente. El backend conserva dos avisos
moderados por `uuid` transitivo de ExcelJS; npm solo propone una operación
breaking. Ninguno se forzó en este sprint.
