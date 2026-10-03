# Base de datos actual consolidada

Este documento describe la unica estructura vigente de PostgreSQL que utiliza Trazaap.

La migracion unica oficial esta en:

```text
backend/sql/001_schema_actual.sql
```

No se requiere ejecutar ningun otro archivo SQL. Las cargas iniciales de datos se realizan
con los comandos `npm run seed` y `npm run seed:materias`.

## Roles vigentes

El sistema usa tres roles oficiales:

- `administrador`
- `gerente`
- `operario`

Los nombres validos de rol son `administrador`, `gerente` y `operario`.

## Tablas actuales

- `roles`: catalogo de roles del sistema.
- `users`: usuarios activos, credenciales y rol asociado.
- `providers`: proveedores con contacto, certificaciones y estado.
- `raw_materials`: catalogo de materias primas, unidad base, tipo de insumo y proveedor asociado.
- `receptions`: recepciones de materias primas por proveedor, lote, cantidad, unidad, temperatura y estado.
- `reception_inspections`: inspeccion de producto y vehiculo asociada a cada recepcion.
- `inventario_materias_primas`: inventario acumulado por materia prima aceptada.
- `inventario_movimientos`: entradas, salidas y ajustes auditables del inventario.
- `trazabilidad_eventos`: eventos funcionales de trazabilidad operativa.
- `productos_fabricados`: catalogo de productos finales y parametros de proceso.
- `producto_variantes`: presentaciones o tamanos por producto.
- `producto_variante_materia_prima`: receta especifica por variante de producto.
- `ordenes_produccion`: cabecera de ordenes de produccion.
- `ordenes_produccion_productos`: productos programados dentro de una orden.
- `ordenes_produccion_materias`: materias primas planificadas y reales usadas en una orden.
- `registro_manufactura`: ejecucion real por producto de la orden, con lote producido, unidades y tiempos/temperaturas reales.
- `liberacion_producto`: control final de empaque, etiquetado, lote visible, vencimiento y calidad antes de despacho.
- `inventario_producto_terminado`: lotes aprobados en liberacion y disponibles para despacho.
- `documentos_inocuidad`: metadatos de documentos sanitarios transversales almacenados en MinIO, con entidad emisora, referencia y vigencia.
- `epcis_identificadores_lote` y `auditoria_interoperabilidad`: interoperabilidad GS1 EPCIS preparada y auditable.
- `consecutivos_lote_producto`: consecutivos de lotes por producto y fechas de fabricacion/vencimiento.
- `alertas_vencimiento_lote`: alertas unicas de proximo vencimiento y vencimiento.

Los controles de inocuidad que permanecen en el alcance se registran dentro de las etapas
operativas de recepcion, manufactura, liberacion y despacho. No existe un modulo
independiente de definiciones de calidad ni de devoluciones/no conformidades.

## Modelo de inventario por produccion

El inventario se incrementa cuando una recepcion queda en estado `aceptado`.

Las ordenes de produccion seleccionan una variante especifica de producto. Cada variante tiene una receta propia con cantidades por unidad. Al crear la orden:

- Se calcula la cantidad total requerida por materia prima.
- Se valida que exista inventario suficiente.
- Se registra la materia prima planificada en `ordenes_produccion_materias`.
- Se descuenta el saldo en `inventario_materias_primas`.
- Se crea un movimiento de salida en `inventario_movimientos`.

## Registro de manufactura

Los productos conservan los tiempos y temperaturas estandar como valores esperados. La orden de produccion conserva la planificacion y no asigna un responsable unico, porque los operarios trabajan bajo la misma orden. La tabla `registro_manufactura` almacena lo que realmente ocurrio por cada producto programado: lote producido, unidades producidas, tiempos reales, temperaturas reales, horas de inicio y fin, observaciones y operario responsable seleccionado desde los usuarios activos con rol `operario`.

Cada registro de manufactura queda enlazado directamente con `ordenes_produccion` mediante `id_orden_produccion` y con el producto programado mediante `id_producto`. No se usa una tabla intermedia de lotes terminados.

Cuando todos los productos de una orden tienen manufactura registrada, la orden puede pasar a `lista_para_liberacion`.

## Liberacion de producto

La liberacion ocurre despues del registro de manufactura y antes del despacho. Solo aparecen productos con manufactura registrada y lote producido que aun no tengan liberacion.

La tabla `liberacion_producto` registra las validaciones obligatorias de etiqueta, lote visible, fecha de vencimiento visible, empaque conforme y producto en buen estado. El estado final puede ser `aprobado`, `retenido` o `rechazado`; si queda retenido o rechazado debe registrarse el motivo correspondiente.

Cuando la liberacion queda `aprobado`, el sistema crea automaticamente el registro en `inventario_producto_terminado` con estado `disponible`. Los productos retenidos o rechazados no quedan disponibles para despacho.

## Despachos parciales

La tabla despachos contiene la salida comercial y logistica: cliente, factura, fecha, responsable, conductor, placa, temperaturas, condiciones del vehiculo y canal. La tabla despacho_detalle enlaza cada despacho con el inventario terminado y conserva la cantidad despachada por lote. Por eso un lote puede tener varios despachos y no se repiten esos datos en liberacion_producto.

## Blockchain

PostgreSQL no almacena hashes, bloques ni evidencia blockchain. Los datos operativos permanecen en las tablas funcionales y la evidencia criptografica se registra en Hyperledger Fabric mediante chaincode.

Para recepciones e inspecciones, el backend normaliza el registro operativo, calcula un hash SHA-256 estable y lo envia a Fabric. En la consulta de trazabilidad, el hash actual se recalcula y se valida contra el hash inmutable guardado en el ledger.

## Uso recomendado

Para una base vacia o una instalacion limpia, usa unicamente este flujo:

```bash
cd backend
npm run migrate
```

El comando es idempotente para las tablas y restricciones vigentes. En una base existente,
conserva los datos operativos y aplica los ajustes compatibles del esquema consolidado.
