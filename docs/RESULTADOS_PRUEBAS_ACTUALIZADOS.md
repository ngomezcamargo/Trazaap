# Resultados de pruebas de Trazaap

## Alcance de la verificacion

La verificacion se ejecuto sobre la version actual del repositorio, sin
modificar el codigo ni instalar dependencias adicionales. El informe anterior
correspondia a una version previa y no debe usarse para describir el estado
actual: en esa version todavia existian imports de modulos que posteriormente
fueron retirados y el entorno no tenia instaladas todas las dependencias.

En la version vigente, las dependencias del backend y del chaincode se
resuelven correctamente. Los modulos retirados por alcance no se consideran
pruebas fallidas: no existen como funcionalidades activas del sistema.

## Resultados reproducidos

La suite del backend procesó 17 archivos y 59 casos. El resultado fue de 55
casos aprobados, 0 fallidos y 4 omitidos. Los dos casos de outbox omitidos
requieren `RUN_DB_TESTS=true` y una base PostgreSQL aislada. Los dos casos de
validacion formal EPCIS se omiten cuando no está preparado el esquema oficial
local. Ninguno corresponde a un fallo funcional del sistema.

| Conjunto de pruebas | Casos ejecutados | Aprobados | Omitidos | Resultado | Alcance de la evidencia |
| --- | ---: | ---: | ---: | --- | --- |
| Control de acceso RBAC | 4 | 4 | 0 | Aprobado unitario | Autoriza roles permitidos y rechaza roles invalidos. |
| Codigos de acceso externo | 2 | 2 | 0 | Aprobado unitario | Verifica formato, estabilidad y normalizacion. |
| Generacion de lotes | 7 | 7 | 0 | Aprobado unitario | Verifica prefijos, fechas, consecutivos y unicidad. |
| Hashes de trazabilidad | 3 | 3 | 0 | Aprobado unitario | Verifica normalizacion estable de recepcion e inspeccion. |
| Almacenamiento | 6 | 6 | 0 | Aprobado unitario | Verifica rangos, retenciones, controles y salida. |
| Despachos parciales | 5 | 5 | 0 | Aprobado unitario | Verifica reservas, confirmaciones, saldos y bloqueos. |
| RF13 backend-chaincode | 4 | 4 | 0 | Aprobado unitario | Verifica liberacion, inventario y reglas de despacho. |
| Documentos y MinIO | 4 | 4 | 0 | Aprobado unitario | Verifica carga, anulacion, descarga y compensacion. |
| Chaincode de Fabric | 17 | 17 | 0 | Aprobado unitario | Verifica registro, validacion, correcciones, inventario, despachos y alertas con stub de memoria. |

## Estado de la red Fabric

La red local se comprobo con `fabric/scripts/status.sh`. El canal
`trazabilidad-channel` y el chaincode `traceability` aparecen confirmados en
`peer0` y `peer1`, actualmente con version `2.5` y secuencia `8`.

Esta comprobacion demuestra que la definicion del chaincode esta desplegada en
los peers. No equivale por sí sola a una prueba de extremo a extremo de una
operacion del backend contra Fabric.

## Integracion de extremo a extremo

La prueba de integracion se ejecuto con PostgreSQL, el backend y Fabric
activos mediante:

```bash
cd backend
npm run test:integration:isolated
```

Esta prueba crea una base temporal, levanta una API aislada y valida el flujo
completo: recepcion, inspeccion, produccion, manufactura, almacenamiento,
liberacion, inventario, despachos parciales, saldo en Fabric, concurrencia,
confirmacion del cliente, consulta interna por lote y reporte PDF/Excel. El
resultado reproducido fue `INTEGRACION_AISLADA_VERIFICADA`; al finalizar se
elimino la base temporal.

## Correcciones frente al informe anterior

- No debe reportarse `pg`, `dotenv`, `zod`, `@grpc/grpc-js` ni Fabric Gateway
  como dependencias ausentes en la version actual.
- No debe incluirse saneamiento como conjunto de pruebas pendiente: se retiro
  del producto por estar fuera del alcance vigente.
- No deben presentarse las referencias a calidad o devoluciones retiradas como
  errores de la aplicacion.
- Los 17 casos del chaincode prueban la logica del contrato con un stub de
  memoria; la prueba de red viva debe documentarse aparte.
- El resultado actual de la suite no es "6 aprobadas y 13 fallidas": es
  `55 aprobadas, 0 fallidas y 4 omitidas` en backend, más `17/17` aprobadas en
  el chaincode.
- La integracion aislada de RF05 termino con despachos parciales `3 + 4 + 3`,
  saldo cero en PostgreSQL y Fabric, rechazo de solicitudes sin existencias,
  confirmacion del cliente y reportes generados correctamente.
