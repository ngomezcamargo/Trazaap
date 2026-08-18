# RNF11 — Interoperabilidad

## Interpretación de la línea base

`Anexos.pdf` exige una API REST autenticada con OAuth 2.0, respuestas JSON e intercambio de eventos de trazabilidad mediante GS1 EPCIS 2.0 para integraciones de inventario, logística y control de calidad. El anexo técnico precisa access tokens JWT RS256 de 15 minutos, refresh tokens de 8 horas, access token en memoria y refresh token en cookie HttpOnly, Secure y SameSite=Strict. El portal QR público permanece sin autenticación.

No define proveedor OAuth, URL de issuer, clientes, scopes, GLN, GTIN, SSCC, EPC empresariales ni acuerdos con socios. Tampoco existe una HU dedicada a interoperabilidad. Hay una discordancia por resolver: RNF11 pide integración externa mientras RT-04 declara operación autocontenida sin integración externa. La implementación queda on-premise, configurable y deshabilitada por defecto.

## Arquitectura OAuth 2.0

Trazaap es Resource Server y cliente web OAuth. La emisión, claves, usuarios federados y revocación pertenecen a un Authorization Server estándar on-premise; se recomienda Keycloak o equivalente compatible con metadata OAuth/OIDC y JWKS. No se implementa un Authorization Server propio.

Flujo objetivo: Authorization Code + PKCE S256. El frontend genera `state`, verifier y challenge; el backend intercambia el código usando redirect URI fija. El access token solo vive en memoria. El refresh token se establece como cookie HttpOnly/Secure/SameSite=Strict con máximo local de ocho horas. El servidor estándar debe configurarse para access tokens de 15 minutos y refresh de ocho horas.

Durante la transición coexisten:

- JWT HS256 legado (`AUTH_LEGACY_JWT_ENABLED=true`), necesario para no romper el login y las pruebas actuales.
- access tokens OAuth JWT RS256 (`OAUTH_ENABLED=true`), validados por issuer, audience, algoritmo, expiración y JWKS.

Cada identidad OAuth se vincula explícitamente a un usuario interno activo mediante `oauth_identities`. El rol siempre se toma de PostgreSQL; no se confía en un rol enviado por el cliente. Desactivar al usuario invalida su acceso efectivo en la siguiente solicitud aunque el token siga criptográficamente vigente.

Scopes mínimos propuestos: `trazaap.read`, `trazaap.operate`, `trazaap.admin`, `reports.read`, `epcis.query` y `epcis.capture`. Los endpoints EPCIS exigen access token OAuth, no aceptan JWT legado.

## EPCIS 2.0

EPCIS es una representación de interoperabilidad. PostgreSQL continúa como fuente operativa y Fabric conserva evidencia/hash de eventos internos. No se almacenan documentos EPCIS en chaincode.

| Evento Trazaap | Evento EPCIS | Semántica |
|---|---|---|
| Recepción | ObjectEvent / ADD / receiving | Entrada del objeto/clase al inventario |
| Manufactura | TransformationEvent | Insumos identificados transformados en producto identificado |
| Envasado | ObjectEvent / OBSERVE / packing | Observación de empaque del lote |
| Almacenamiento | ObjectEvent / OBSERVE / storing | Movimiento/estado de almacenamiento |
| Calidad y liberación | ObjectEvent / OBSERVE / inspecting | Inspección del objeto trazable |
| Despacho | ObjectEvent / OBSERVE / shipping | Salida logística |
| Devolución | ObjectEvent / OBSERVE / receiving / returned | Retorno del objeto |

Órdenes de producción, saneamiento y alertas de vencimiento permanecen internos porque no hay correspondencia EPCIS inequívoca. La manufactura solo se emite si existen identificadores configurados para insumos y salida.

Los identificadores se configuran en `epcis_identificadores_lote`. Nunca se generan GLN, GTIN, SSCC o EPC empresariales ficticios. Mientras no sean suministrados se responde `DATO_MAESTRO_EPCIS_PENDIENTE`.

## Interfaces

- `GET /api/epcis/events?lote=...`: OAuth + `epcis.query`; devuelve `application/vnd.gs1.epcis+json` como `EPCISQueryDocument`.
- `POST /api/epcis/capture`: OAuth + `epcis.capture`; valida y audita un `EPCISDocument`, responde 202 y no modifica automáticamente la trazabilidad interna.
- `GET /api/auth/oauth/config`: configuración pública del cliente OAuth.
- `POST /api/auth/oauth/exchange`: intercambio de código PKCE.
- `POST /api/auth/oauth/refresh`: rotación/renovación mediante cookie HttpOnly.
- `POST /api/auth/oauth/logout`: revocación cuando el Authorization Server expone endpoint y eliminación de cookie.

El límite JSON global es 1 MB. La captura limita cada documento a 500 eventos y rechaza eventos sin URI trazable. La auditoría conserva actor, dirección, cantidad, resultado y metadatos no sensibles, pero no el documento completo.

## Despliegue pendiente

1. Instalar el Authorization Server on-premise.
2. Crear realm/tenant y cliente web con Authorization Code, PKCE S256 y redirect URI exacta.
3. Configurar access token en 15 minutos y refresh en 8 horas.
4. Definir scopes y audience `trazaap-api`.
5. Vincular sujetos del issuer con usuarios existentes en `oauth_identities` mediante proceso administrativo controlado.
6. Recibir identificadores GS1 empresariales y ubicaciones/read points.
7. Validar documentos contra el JSON Schema oficial GS1 y realizar interoperabilidad con un socio/repositorio EPCIS real.
8. Solo después evaluar desactivar `AUTH_LEGACY_JWT_ENABLED`.

## Fuentes primarias

- IETF RFC 6749, OAuth 2.0: https://www.rfc-editor.org/rfc/rfc6749
- IETF RFC 6750, Bearer Tokens: https://www.rfc-editor.org/rfc/rfc6750
- IETF RFC 7636, PKCE: https://www.rfc-editor.org/rfc/rfc7636
- IETF RFC 9700, OAuth 2.0 Security BCP: https://www.rfc-editor.org/rfc/rfc9700
- GS1 EPCIS/CBV 2.0.1 y artefactos normativos: https://ref.gs1.org/standards/epcis/artefacts
- GS1 EPCIS JSON Schema 2.0.1: https://ref.gs1.org/standards/epcis/2.0.1/epcis-json-schema.json
- GS1 EPCIS OpenAPI 2.0.1: https://ref.gs1.org/standards/epcis/2.0.1/openapi.json
- GS1 CBV 2.0: https://ref.gs1.org/standards/cbv/2.0.0/
