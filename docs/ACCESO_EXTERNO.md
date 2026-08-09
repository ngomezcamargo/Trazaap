# Acceso externo y portal QR

Trazaap diferencia los usuarios internos del sistema y los actores externos de consulta.

## Usuarios internos

Los usuarios internos ingresan con sesion y estan controlados por RBAC:

- `administrador`
- `gerente`
- `operario`

Estos usuarios trabajan en el panel privado y consumen rutas protegidas con JWT.

## Actores externos

Los actores externos no tienen cuenta administrativa ni sesion interna:

- consumidor final
- cliente/receptor
- auditoria/INVIMA

Su acceso se realiza mediante rutas publicas bajo `/api/public`, sin JWT y sin permisos de escritura.

## Niveles de informacion

| Actor externo | Forma de acceso | Informacion visible |
| --- | --- | --- |
| Consumidor final | QR o enlace `/verificar/:lote` | lote final, producto, fechas principales, estado de liberacion, origen resumido de materias primas y estado general blockchain |
| Cliente/receptor | lote + numero de factura o codigo de cliente | informacion publica, datos de liberacion/entrega, factura, conductor, placa, estado del transporte y validacion blockchain por etapa |
| Auditoria/INVIMA | lote + codigo de auditoria | trazabilidad completa del lote, recepciones, inspecciones, produccion, manufactura, liberacion y hashes de validacion blockchain |

## Endpoints publicos

Base backend: `http://localhost:4000/api`

- `GET /public/traceability/lote/:lote`
- `GET /public/traceability/cliente?lote=<lote>&factura=<factura>`
- `GET /public/traceability/cliente?lote=<lote>&codigo=<codigo_cliente>`
- `GET /public/traceability/auditoria?lote=<lote>&codigo=<codigo_auditoria>`

## Codigos de acceso

Los codigos de cliente y auditoria se generan a partir de datos operativos existentes del lote.

El reporte privado de trazabilidad muestra:

- codigo cliente
- codigo auditoria

Esos codigos se comparten solo cuando se necesita habilitar una consulta externa ampliada.

## Restricciones

- Las rutas publicas no permiten crear, editar ni eliminar informacion.
- La vista de consumidor final no muestra factura, conductor, placa, NIT, correos, responsables internos ni hashes.
- La vista de cliente muestra informacion asociada a la entrega, pero no expone el detalle interno completo.
- La vista de auditoria/INVIMA requiere codigo de auditoria y muestra trazabilidad tecnica completa.
- El backend privado sigue siendo la unica capa con permisos administrativos.
