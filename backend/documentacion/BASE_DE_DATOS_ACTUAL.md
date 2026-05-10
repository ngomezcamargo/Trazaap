# Base de datos actual consolidada

Este documento resume el estado actual del esquema de PostgreSQL despues de aplicar las migraciones `001` a `011`.

La migracion unica oficial esta en:

```text
backend/sql/001_schema_actual.sql
```

Las migraciones historicas quedaron archivadas en:

```text
backend/sql_historico/
```

El archivo de documentacion `backend/documentacion/schema_actual_consolidado.sql` conserva una copia del mismo esquema como referencia.

## Roles vigentes

El sistema usa tres roles oficiales:

- `administrador`
- `gerente`
- `operario`

La migracion `011_normalizar_roles.sql` migra datos antiguos:

- `admin` pasa a `administrador`
- `gerencia` pasa a `gerente`
- `operario` se conserva

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
- `tiempos_produccion`: registros historicos de tiempos, temperaturas y lotes.
- `liberacion_producto`: control final de empaque, etiquetado, lote visible, vencimiento y calidad antes de despacho.
- `inventario_producto_terminado`: lotes aprobados en liberacion y disponibles para despacho.

## Migraciones absorbidas

- `001_init.sql`: estructura inicial.
- `002_operacion_recepcion_y_catalogos.sql`: ampliacion de proveedores, materias primas, recepciones e inspecciones.
- `003_inventario_materias_primas.sql`: inventario de materias primas.
- `004_unidad_medida_recepcion.sql`: unidad de medida en recepciones.
- `005_unidad_base_materias_primas.sql`: unidad base, tipo de insumo y restricciones de materias primas.
- `006_normalizar_unidades_inventario.sql`: normalizacion de unidades en inventario.
- `007_observaciones_producto_orden.sql`: observaciones por producto en orden.
- `008_productos_fabricados_y_recetas.sql`: productos fabricados y recetas.
- `009_tiempos_y_mojes_en_producto.sql`: parametros de proceso de productos fabricados.
- `010_limpieza_mojes_y_columnas_obsoletas.sql`: eliminacion de mojes y columnas obsoletas.
- `011_normalizar_roles.sql`: roles oficiales `administrador`, `gerente`, `operario`.

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

## Blockchain

PostgreSQL no almacena hashes, bloques ni evidencia blockchain. Los datos operativos permanecen en las tablas funcionales y la evidencia criptografica se registra en Hyperledger Fabric mediante chaincode.

Para recepciones e inspecciones, el backend normaliza el registro operativo, calcula un hash SHA-256 estable y lo envia a Fabric. En la consulta de trazabilidad, el hash actual se recalcula y se valida contra el hash inmutable guardado en el ledger.

## Uso recomendado

Para una base vacia o una instalacion limpia, usa el flujo normal:

```bash
cd backend
npm run migrate
```

Para documentacion o revision academica, tambien queda una copia en:

```text
backend/documentacion/schema_actual_consolidado.sql
```

Si ya tenias una base creada con las migraciones antiguas, no necesitas aplicar este archivo sobre esa misma base salvo que quieras recrearla desde cero. En ese caso, primero crea una base vacia y luego ejecuta `npm run migrate`.
