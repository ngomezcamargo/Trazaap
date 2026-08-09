# Validacion blockchain y trazabilidad

Trazaap usa Hyperledger Fabric como capa de integridad. PostgreSQL conserva los datos operativos completos y Fabric conserva la evidencia criptografica de eventos criticos.

## Principio de arquitectura

- PostgreSQL: datos operativos, relaciones, consultas del sistema y reportes.
- Hyperledger Fabric: evidencia inmutable y validacion de integridad.
- Chaincode `traceability`: calcula el hash del payload canonico, registra el evento y valida si el payload actual coincide.

No se guarda una pseudo-blockchain en PostgreSQL y no se duplica el ledger de Fabric en tablas relacionales.

## Eventos criticos implementados

| Evento | Momento de registro | Validacion en trazabilidad |
| --- | --- | --- |
| `recepcion_materia_prima` | al crear una recepcion | si |
| `inspeccion_recepcion` | al crear la inspeccion dentro de la recepcion | si |
| `orden_produccion` | al crear la orden y cuando cambia informacion funcional de la orden | si |
| `producto_fabricado_configurado` | al crear o actualizar producto/receta | si |
| `registro_manufactura` | al registrar manufactura real | si |
| `liberacion_producto` | al liberar producto | si |
| `inventario_producto_terminado` | al aprobar liberacion y crear inventario terminado | si |
| `inventario_materia_prima` | al afectar inventario de materias primas | si |
| `movimiento_inventario` | al registrar entradas/salidas de inventario | si |

## Regla del payload

El hash se calcula sobre datos funcionales del evento:

- que ocurrio
- cuando ocurrio
- quien lo hizo o quien queda asociado
- lote, producto, materia prima, proveedor, cantidades, tiempos, temperaturas, decisiones y observaciones funcionales

No entran al hash:

- `created_at`
- `updated_at`
- ids internos autoincrementales dentro del payload funcional
- tokens o datos de sesion
- estados visuales del frontend
- metadata de interfaz

Los ids tecnicos se usan solo como `idEntidad` para ubicar el evento en Fabric, pero no como parte del payload funcional.

## Consulta de trazabilidad

La consulta interna por lote valida:

- recepciones asociadas
- inspecciones asociadas
- orden de produccion
- producto/receta configurado
- manufactura
- liberacion
- inventario de producto terminado
- inventarios actuales de materias primas relacionadas
- movimientos de inventario asociados a recepcion y manufactura

Cada validacion retorna:

- estado blockchain
- hash actual
- hash en Fabric
- mensaje de validacion

## Estados mostrados

- `VERIFICADO`: el hash actual coincide con la evidencia registrada en Fabric.
- `ALTERADO`: el registro operativo actual no coincide con el hash guardado.
- `NO_ENCONTRADO`: no existe evidencia Fabric para ese evento.
- `PENDIENTE`: Fabric no pudo validar o la evidencia esta pendiente de sincronizacion.

## RF13 - reglas ejecutadas por chaincode

El chaincode 2.0 no permite sobrescribir eventos. Las correcciones son nuevos registros vinculados al original y conservan `txId`, timestamp, MSP e identidad Fabric del invocador.

Antes de un despacho aprobado, el backend construye los controles criticos usando los valores estandar del producto y los valores reales de manufactura. Fabric vuelve a comprobar los rangos, vencimiento, manufactura, inventario, empaque, etiqueta, lote visible, vehiculo y documentacion del conductor. Una respuesta `BLOQUEADO` no crea la liberacion ni modifica inventario; una indisponibilidad de Fabric responde HTTP 503.

Los eventos de decision son `despacho_producto`, `confirmacion_recepcion_cliente`, `correccion_evento` y `alerta_vencimiento`. Se consultan desde el ledger y aparecen en trazabilidad y reportes; no se replican en una tabla blockchain de PostgreSQL.

## Reportes

El reporte de trazabilidad incluye:

- eventos criticos del lote
- validacion blockchain por evento
- hashes actual/Fabric para usuarios autorizados
- QR publico
- codigo cliente
- codigo auditoria
- leyenda de estados de validacion

## Portal publico

El consumidor final no ve hashes ni datos sensibles. La vista de auditoria/INVIMA si puede ver hashes cuando ingresa el codigo de auditoria.
