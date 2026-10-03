# RNF11 — Interoperabilidad

## Alcance vigente

Trazaap funciona como una aplicación interna y autocontenida. La interoperabilidad
actual se ofrece mediante la API REST del backend, que usa respuestas JSON y la
autenticación interna de la aplicación. No se requiere un proveedor externo de
identidades ni una cuenta adicional para operar el sistema.

La consulta de trazabilidad se realiza desde el sistema mediante el lote producido.
Los clientes, auditores o responsables de la empresa no acceden a una vista externa:
la información se consulta en el aplicativo o se genera en los reportes autorizados.

## Autenticación y autorización

El backend valida un JWT emitido por el inicio de sesión interno y después aplica
RBAC mediante `rolesMiddleware`. El rol se obtiene del usuario almacenado en
PostgreSQL y determina las acciones permitidas. La sesión se cierra por inactividad
prolongada o cuando el usuario sale explícitamente.

No se implementan flujos de autenticación federada, proveedores externos, clientes
ni tablas de identidades externas, porque no hacen parte del alcance
operativo definido para la versión local.

## EPCIS 2.0

EPCIS es una representación de interoperabilidad. PostgreSQL continúa como fuente operativa y Fabric conserva evidencia/hash de eventos internos. No se almacenan documentos EPCIS en chaincode.

| Evento Trazaap | Evento EPCIS | Semántica |
|---|---|---|
| Recepción | ObjectEvent / ADD / receiving | Entrada del objeto/clase al inventario |
| Manufactura | TransformationEvent | Insumos identificados transformados en producto identificado |
| Almacenamiento | ObjectEvent / OBSERVE / storing | Movimiento/estado de almacenamiento |
| Calidad y liberación | ObjectEvent / OBSERVE / inspecting | Inspección del objeto trazable |
| Despacho | ObjectEvent / OBSERVE / shipping | Salida logística |
| Devolución | ObjectEvent / OBSERVE / receiving / returned | Retorno del objeto |

Órdenes de producción y alertas de vencimiento permanecen internos porque no hay correspondencia EPCIS inequívoca. La manufactura solo se emite si existen identificadores configurados para insumos y salida.

Los identificadores se configuran en `epcis_identificadores_lote`. Nunca se generan GLN, GTIN, SSCC o EPC empresariales ficticios. Su estado de cierre es `DATOS MAESTROS GS1 PENDIENTES DE LA EMPRESA`; mientras no sean suministrados se responde `DATO_MAESTRO_EPCIS_PENDIENTE`.

## Interfaces

- `GET /api/epcis/events?lote=...`: consulta JSON de eventos EPCIS, protegida por JWT y rol autorizado.
- `POST /api/epcis/capture`: recibe y valida un documento EPCIS cuando la integración se habilita,
  sin modificar automáticamente la trazabilidad operativa.

El límite JSON global es 1 MB. La captura limita cada documento a 500 eventos y rechaza eventos sin URI trazable. La auditoría conserva actor, dirección, cantidad, resultado y metadatos no sensibles, pero no el documento completo.

## Pendientes de interoperabilidad externa

1. Recibir identificadores GS1 empresariales y ubicaciones/read points.
2. Validar documentos contra el JSON Schema oficial GS1.
3. Acordar con un socio o entidad externa el contrato de intercambio de eventos.
4. Definir credenciales técnicas únicamente si se habilita una integración servidor a servidor.

## Fuentes primarias

- GS1 EPCIS/CBV 2.0.1 y artefactos normativos: https://ref.gs1.org/standards/epcis/artefacts
- GS1 EPCIS JSON Schema 2.0.1: https://ref.gs1.org/standards/epcis/2.0.1/epcis-json-schema.json
- GS1 EPCIS OpenAPI 2.0.1: https://ref.gs1.org/standards/epcis/2.0.1/openapi.json
- GS1 CBV 2.0: https://ref.gs1.org/standards/cbv/2.0.0/
