# RF05 - Distribucion y comercializacion

## Alcance implementado

RF05 registra la salida comercial de producto terminado sin confundirla con la liberacion de calidad. Una liberacion aprobada crea existencias disponibles; uno o varios despachos posteriores consumen esas existencias de forma parcial y las relacionan con cliente, factura, transporte, responsable y fecha.

El modelo permite:

- varios despachos para un mismo lote;
- un despacho con uno o varios lotes;
- clientes comerciales sin cuenta en el panel interno;
- saldo liberado, reservado, despachado y disponible;
- confirmacion de entrega por factura o codigo privado;
- consulta publica sin datos comerciales de otros receptores;
- evidencia y control de saldo mediante Hyperledger Fabric.

## Modelo de datos

| Tabla | Responsabilidad |
| --- | --- |
| `clientes` | Datos comerciales del receptor; no contiene credenciales. |
| `despachos` | Encabezado: cliente, factura, fecha, responsable y transporte. |
| `despacho_detalle` | Relacion N:M entre despacho e inventarios terminados, con cantidad por lote. |
| `confirmaciones_entrega` | Evidencia operativa de recepcion del despacho por el cliente. |
| `inventario_producto_terminado` | Saldos liberados, reservados, despachados y disponibles. |
| `blockchain_outbox` | Referencia tecnica para entregar eventos a Fabric sin guardar payloads ni hashes del ledger. |

La migracion incremental es `backend/sql/002_rf05_despachos_parciales.sql`. El mismo estado se encuentra consolidado en `backend/sql/001_schema_actual.sql` para instalaciones nuevas.

## Flujo operativo

1. Manufactura registra el lote y las unidades reales.
2. Almacenamiento controla su conservacion y habilita la salida a liberacion.
3. Liberacion aprobada crea inventario terminado e inicializa el saldo en Fabric.
4. El operario selecciona cliente, factura, transporte y uno o varios lotes.
5. PostgreSQL bloquea las filas de inventario y reserva las cantidades en una transaccion.
6. El worker de outbox invoca el chaincode.
7. Si Fabric aprueba, la reserva pasa a despachada. Si rechaza, se devuelve al disponible y el despacho queda bloqueado.
8. El cliente consulta su entrega con factura o codigo privado y puede confirmar la recepcion.
9. Trazabilidad, QR y reporte muestran cada despacho parcial como un evento independiente.

## Regla de saldo en chaincode

El world state usa la clave `saldo_producto_terminado:{idInventario}`. La liberacion llama `inicializarInventarioProductoTerminado` con las unidades liberadas. Cada `registrarDespacho` lee ese saldo, valida cada cantidad y actualiza las unidades despachadas dentro de la misma transaccion Fabric.

Errores funcionales:

- `LOTE_SIN_EXISTENCIAS`: el saldo disponible es cero.
- `STOCK_INSUFICIENTE`: la cantidad solicitada supera el saldo.
- `DESPACHO_DUPLICADO`: el identificador ya fue registrado.

Cuando dos propuestas intentan consumir simultaneamente el mismo saldo, ambas escriben la misma clave. El control MVCC de Fabric invalida la propuesta conflictiva, por lo que no se produce saldo negativo.

## Estados

Inventario terminado:

- `disponible`
- `despacho_parcial`
- `despachado_total`
- `retenido`

Despacho:

- `pendiente_validacion_blockchain`
- `despachado`
- `entregado`
- `bloqueado`
- `cancelado` reservado para anulaciones administrativas futuras

## Permisos

- Administrador: mantiene clientes y puede operar por privilegio global.
- Gerente: consulta clientes, inventario y despachos.
- Operario: registra y consulta despachos; consulta clientes activos desde el formulario.
- Cliente: no tiene cuenta interna. Solo consulta y confirma su propio despacho con factura o codigo privado.
- Consumidor: ve el historial publico del lote sin cliente, factura, conductor, placa ni codigos privados.
- INVIMA/auditoria: usa el acceso controlado del lote para consultar el detalle tecnico.

## Componentes principales

- Backend: `backend/src/modulos/clientes` y `backend/src/modulos/despachos`.
- Integracion Fabric: `backend/src/modulos/blockchain` y outbox.
- Chaincode: `fabric/chaincode/traceability/index.js`.
- Frontend: `frontend/src/app/clientes` y `frontend/src/app/despachos`.
- Portal externo: `frontend/src/app/verificar/[lote]`.
- Reporte: `frontend/src/app/reportes/trazabilidad/[lote]`.

## Verificacion reproducible

Pruebas unitarias y de servicios:

```bash
cd backend
npm test

cd ../fabric/chaincode/traceability
npm test
```

Prueba real con PostgreSQL, Gateway, orderer y ambos peers activos:

```bash
cd backend
npm run test:rf05
```

La prueba integral crea dos lotes de diez unidades, ejecuta despachos 3 + 4 + 3, prueba un despacho con varios lotes, enfrenta dos solicitudes concurrentes, verifica el saldo en PostgreSQL y Fabric, comprueba el rechazo sin existencias y confirma una entrega con credenciales del cliente.

El estado del chaincode desplegado se consulta con:

```bash
cd fabric
./scripts/status.sh
```

La version asociada a este flujo es `traceability` 2.4, secuencia 6, instalada en `peer0` y `peer1`.

## Compatibilidad con datos existentes

Los registros historicos en los que liberacion tambien contenia factura y transporte se migran como despachos heredados para no perder trazabilidad. Se identifican con codigos `LEG-*`. La secuencia tecnica de nuevos despachos se ubica por encima de los ids historicos ya utilizados en Fabric, evitando colisiones de claves inmutables.
