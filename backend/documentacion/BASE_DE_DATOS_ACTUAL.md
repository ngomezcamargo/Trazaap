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
- `trazabilidad_eventos`: eventos funcionales de trazabilidad.
- `eventos_blockchain`: eventos con hash SHA-256 y payload para la integracion blockchain.
- `productos_fabricados`: catalogo de productos finales y parametros de proceso.
- `producto_variantes`: presentaciones o tamanos por producto.
- `producto_variante_materia_prima`: receta especifica por variante de producto.
- `ordenes_produccion`: cabecera de ordenes de produccion.
- `ordenes_produccion_productos`: productos programados dentro de una orden.
- `ordenes_produccion_materias`: materias primas planificadas y reales usadas en una orden.
- `tiempos_produccion`: registros de tiempos, temperaturas, carros/escabiladeros y lotes.
- `lotes_producto_terminado`: lote final generado por una orden.
- `liberaciones_producto`: liberacion, transporte, verificacion y destino del producto terminado.

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
