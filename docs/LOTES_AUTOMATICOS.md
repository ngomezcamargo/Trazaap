# Lotes automaticos

Trazaap genera el lote producido al registrar la manufactura. El operario no
digita este valor.

## Formato

`PREFIJO-AAAAMMDD-AAAAMMDD-CONSECUTIVO`

Ejemplo: `BG-20260813-20260818-0001`.

- `PREFIJO` identifica el producto y tiene entre 2 y 5 caracteres alfanumericos.
- El primer `AAAAMMDD` usa `ordenes_produccion.fecha_produccion`.
- El segundo `AAAAMMDD` corresponde a la fecha de vencimiento calculada por la vida útil del producto.
- El consecutivo inicia en `0001` por prefijo, fecha de fabricación y fecha de vencimiento, y aumenta hasta `9999`.
- La fecha se interpreta como fecha calendario de la orden; no se toma la fecha del navegador.

## Prefijos actuales

| Producto | Prefijo |
| --- | --- |
| Bagel | BG |
| Pan trenza | PANTR |
| Pan dinner roll | PANDI |
| Crouton | CROUT |
| Miga de pan | MIGAD |
| Pan molde | PANMO |
| Pan perro | PANPE |
| Pan hamburguesa | PANHA |
| Pan pita | PANPI |
| Pan arabe | PANAR |
| Pan sandwich miga | PANSA |
| Rollo de canela | ROLLO |
| Pan de chocolate | PANDE |
| Croissant | CROIS |
| Corazones | CORAZ |
| Alfajores | ALFAJ |
| Chips de chocolate | CHIPS |
| Avena con pasas | AVENA |
| Crinkle de chocolate | CRINK |

El prefijo pertenece al producto general y no a su variante o tamano.

## Persistencia y concurrencia

`consecutivos_lote_producto(prefijo_producto, fecha_fabricacion,
fecha_vencimiento, ultimo_consecutivo)` mantiene el ultimo valor. La clave
primaria combina prefijo y las dos fechas, y el
incremento se hace con `INSERT ... ON CONFLICT DO UPDATE` dentro de la misma
transaccion que inserta `registro_manufactura`. La tabla de manufactura tiene
ademas una restriccion unica sobre `lote_producido`.

Si falla cualquier parte de la operacion de manufactura, PostgreSQL revierte
el registro, el contador, el consumo de inventario, los estados y el evento
operativo.

## Compatibilidad

Los lotes anteriores se mantienen sin cambios y siguen siendo consultables.
El valor generado se reutiliza en liberacion, inventario de producto
terminado, trazabilidad, reportes y eventos de Hyperledger Fabric.
