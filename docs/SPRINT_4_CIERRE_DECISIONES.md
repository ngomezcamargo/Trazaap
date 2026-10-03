# Sprint 4 de cierre: decisiones y pendientes

Este documento no acredita requisitos ni reemplaza el Plan de Pruebas.

## Decisiones cerradas en el cierre funcional

- **RF03-B — formato adoptado.** El lote se genera exclusivamente en backend
  con el formato lógico `PREFIJO-AAAAMMDD-AAAAMMDD-NNNN`: prefijo único del
  producto, fecha de fabricación, fecha de vencimiento y consecutivo
  transaccional. Los lotes históricos se conservan sin reescritura.
- **RF13 — ambos estados adoptados.** El sistema distingue
  `proximo_vencimiento`, con umbral técnico configurable, y `vencido`. La
  persistencia evita duplicar una alerta del mismo tipo para el mismo lote.
- **RF16 — fuera del alcance actual.** El módulo independiente de devoluciones y
  lotes no conformes se retiró para mantener una operación acotada. La
  liberación rechazada o retenida continúa siendo el mecanismo previo al
  despacho.

## Pendientes de definición o validación externa

- **RF04 — BLOQUEADO POR REGLA FUNCIONAL/INGENIERO DE ALIMENTOS.** La frase
  "no mayor de 4 °C ±2 °C" no determina inequívocamente si se acepta 2–6 °C,
  un máximo absoluto, qué productos aplican ni la acción ante desvío. Se
  conserva el rango configurable por producto.
- **RF07/RF08 — alcance operativo simplificado.** Se conservan las comparaciones
  de manufactura, las inspecciones de recepción y las validaciones de
  liberación. Los módulos independientes de HACCP y controles de calidad por
  lote se retiraron; no se cargaron catálogos ni resultados ficticios.
- **RF14 — campos normativos finales:** multilote (máximo 50), consolidación
  y Excel están implementados; el mapeo definitivo del Artículo 22 requiere
  validación externa.
- **RF15 — listas de chequeo:** el motor acepta ítems extensibles, pero las
  plantillas finales requieren definición sanitaria.
- **GS1:** GTIN, GLN, SSCC y EPC reales son datos maestros pendientes de la
  empresa; el mapeo permanece configurable y las pruebas usan datos ficticios.

## PROPUESTA TÉCNICA RNF11

La implementación vigente expone una API REST JSON protegida por el inicio de
sesión interno y RBAC. PostgreSQL conserva la operación, mientras Fabric conserva
la evidencia de los eventos críticos. La integración GS1 EPCIS quedó preparada en
endpoints separados, pero no requiere un proveedor externo de identidades ni un
flujo de autenticación adicional para la operación local.

La consulta principal se realiza por lote dentro del sistema y los reportes se
generan desde esa misma información. Una integración servidor a servidor podrá
definirse posteriormente cuando exista un socio, contrato de intercambio e
identificadores GS1 reales.

## Base de datos y despliegue futuro

Aplicar en un ambiente nuevo unicamente `backend/sql/001_schema_actual.sql`.
Las cargas iniciales de usuarios y catalogos se ejecutan por separado mediante los
scripts `npm run seed` y `npm run seed:materias`.

La secuencia completa se validó desde cero en PostgreSQL efímero. Antes del
despliegue formal debe existir respaldo y revisión de datos históricos; esta
validación técnica no sustituye QA.

## Fabric

Los eventos de empaque se registran dentro de manufactura y liberación. El
chaincode genérico registra los eventos críticos sin duplicar el ledger en
PostgreSQL. Si la organización versiona el paquete por cambios de contratos/tests,
la sugerencia conservadora es siguiente versión menor y `sequence + 1`; los
valores concretos deben obtenerse del lifecycle desplegado, no asumirse aquí.

## Estado técnico Sprint 4.2

Quedaron implementados RF17/MinIO y RF14 multilote/Excel. MinIO queda
disponible mediante el perfil
`documents`, con anulación auditable y control de descarga. El levantamiento
de MinIO y la aplicación de migraciones dependen del ambiente local; no se
modificó el ambiente formal de QA.

Persisten como validaciones humanas: productos/rangos/reacciones de
refrigeración, campos finales del Artículo 22 e identificadores empresariales
GS1.

## Dependencias pendientes

Next.js fue actualizado a 16.3.2 y el backend a AJV 8.18.0; la auditoría de
dependencias queda sin vulnerabilidades reportadas. ExcelJS conserva su API
actual y usa `uuid` 11.1.1 mediante una sustitución controlada compatible con
la generación de reportes.
