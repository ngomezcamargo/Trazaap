# Fuente de verdad: liberacion y despacho

## Decision funcional

La liberacion de producto es el control final de calidad del producto terminado. El despacho es la salida comercial y logistica. Se mantienen separados porque un mismo lote puede entregarse parcialmente a varios clientes, con facturas y transportistas diferentes.

| Dato | Modulo responsable | Persistencia | Regla |
| --- | --- | --- | --- |
| Responsable de liberacion, fecha, empaque, unidades, peso, vencimiento, etiqueta, envase, lote visible, decision y motivos | Liberacion | liberacion_producto | Se registra una sola vez y habilita o bloquea el inventario terminado |
| Cliente, factura, cantidad por lote, conductor, placa, temperaturas de salida/transporte, limpieza, documentacion, canal y responsable de despacho | Despacho | despachos + despacho_detalle | Se registra una vez por salida; permite despachos parciales |
| Condiciones del vehiculo y higiene del conductor de entrada | Recepcion/inspeccion | reception_inspections | Corresponde al transporte que llega con la materia prima y no al despacho |
| Estado y saldo del producto terminado | Inventario | inventario_producto_terminado | Se deriva de liberacion aprobada y de los despachos confirmados |

## Cambios aplicados

- El formulario de liberacion ya no muestra ni envia factura, conductor, placa, limpieza del vehiculo ni documentacion/dotacion.
- El esquema SQL oficial no crea esos campos en liberacion_producto y la migracion idempotente los elimina de bases existentes.
- La API de liberacion usa un esquema estricto: si un cliente envia datos logisticos antiguos, la solicitud se rechaza en vez de guardarlos silenciosamente.
- El payload liberacion_producto de Fabric contiene solo la evidencia de calidad; el payload despacho_producto contiene la evidencia logistica y comercial.
- El portal, la trazabilidad y los reportes consultan factura y transporte desde cada despacho. La liberacion solo informa su decision y sus controles.
- Los datos historicos de la base local se conservaron: las liberaciones que contenian informacion logistica ya contaban con un despacho asociado, que es la fuente operativa vigente.

## Verificacion

- Esquema aplicado con backend/scripts/migrate.js.
- Liberacion sin columnas logisticamente duplicadas.
- Despacho conserva las columnas de factura, conductor, placa, condiciones de transporte y responsable.
- Pruebas automatizadas de backend: 55 aprobadas, 0 fallidas y 4 omitidas por dependencias externas opcionales antes de esta intervencion.

## Flujo esperado

1. Se registra manufactura y se prepara el lote.
2. Se libera el producto mediante controles de calidad.
3. Si se aprueba, se crea inventario terminado disponible.
4. Se registra uno o varios despachos parciales, cada uno con su cliente y datos logisticos.
5. Trazabilidad y blockchain muestran la liberacion y cada despacho como eventos distintos.
