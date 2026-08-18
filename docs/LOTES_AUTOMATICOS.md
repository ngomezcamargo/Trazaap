# Lotes automaticos

Trazaap genera el lote producido al registrar la manufactura. El operario no
digita este valor.

## Formato

`PREFIJO-AAAAMMDD-CONSECUTIVO`

Ejemplo: `BG-20260813-001`.

- `PREFIJO` identifica el producto y tiene entre 2 y 5 caracteres alfanumericos.
- `AAAAMMDD` usa `ordenes_produccion.fecha_produccion`.
- El consecutivo inicia en `001` por prefijo y fecha, y aumenta a `1000`, `1001`, etc.
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

`consecutivos_lote(prefijo_producto, fecha_produccion, ultimo_consecutivo)`
mantiene el ultimo valor. La clave primaria combina prefijo y fecha, y el
incremento se hace con `INSERT ... ON CONFLICT DO UPDATE` dentro de la misma
transaccion que inserta `registro_manufactura`. La tabla de manufactura tiene
ademas una restriccion unica sobre `lote_producido`.

Si falla cualquier parte de la operacion de manufactura, PostgreSQL revierte
el registro, el contador, el consumo de inventario, los estados y el evento
operativo.

## Compatibilidad

Los lotes anteriores se mantienen sin cambios y siguen siendo consultables.
El valor generado se reutiliza en liberacion, inventario de producto
terminado, trazabilidad, QR, reportes y eventos de Hyperledger Fabric.
