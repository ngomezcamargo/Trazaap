# Demo Hyperledger Fabric en Trazaap

Esta guia resume como probar la integracion actual de Trazaap con Hyperledger Fabric.

## Arquitectura

Trazaap mantiene los datos completos en PostgreSQL y usa Fabric como capa de evidencia criptografica.

```text
Registro operativo en PostgreSQL
-> Backend normaliza el registro
-> Backend envia el payload normalizado a Fabric
-> Chaincode calcula SHA-256 y guarda el hash inmutable
-> Consulta de trazabilidad reconstruye el payload actual y Fabric lo valida
```

No existe tabla PostgreSQL para duplicar bloques, hashes, payloads del ledger ni evidencia blockchain.

## Chaincode

El chaincode esta en:

```text
fabric/chaincode/traceability
```

Funciones principales:

- `registrarEvento(tipoEvento, idEntidad, lote, actor, fechaEvento, payloadJson)`
- `validarEvento(tipoEvento, idEntidad, payloadActualJson)`
- `consultarEvento(tipoEvento, idEntidad)`
- `consultarEventosPorLote(lote)`
- `registrarCorreccionEvento(tipoEventoOriginal, idEntidadOriginal, motivo, actor, payloadCorregido)`
- `consultarHistorialEvento(tipoEvento, idEntidad)`
- `validarDespacho(datos)` y `registrarDespacho(datos)`
- `confirmarRecepcionCliente(...)`
- `registrarAlertaVencimiento(datos)`

`registrarEvento` es inmutable: un segundo registro con la misma clave falla con `EVENTO_DUPLICADO`. Las actualizaciones funcionales autorizadas quedan como correcciones independientes y la ultima version se valida como `VERIFICADO_CORREGIDO`. Para desplegar RF13 sobre un ledger existente se usa la version `2.2`, secuencia `4`; no se eliminan volumenes, canal ni certificados.

La clave del estado en Fabric usa:

```text
tipoEvento:idEntidad
```

Ejemplo:

```text
recepcion_materia_prima:15
```

## Configuracion Esperada

Variables relevantes del backend:

```env
FABRIC_ENABLED=true
FABRIC_MSP_ID=Org1MSP
FABRIC_CHANNEL_NAME=trazabilidad-channel
FABRIC_CHAINCODE_NAME=traceability
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.trazaap.local
FABRIC_TLS_CERT_PATH=../fabric/organizations/peerOrganizations/org1.trazaap.local/peers/peer0.org1.trazaap.local/tls/ca.crt
FABRIC_CERT_PATH=../fabric/organizations/peerOrganizations/org1.trazaap.local/users/Admin@org1.trazaap.local/msp/signcerts/cert.pem
FABRIC_KEY_PATH=../fabric/organizations/peerOrganizations/org1.trazaap.local/users/Admin@org1.trazaap.local/msp/keystore/priv_sk
```

Si `FABRIC_ENABLED=false` o la red no esta disponible, el registro operativo no se rompe: la evidencia queda como `PENDIENTE` en la respuesta del backend, sin crear tablas locales de respaldo.

## Flujo De Prueba

1. Levanta PostgreSQL, backend, frontend y la red Fabric.
2. Despliega el chaincode `traceability` en el canal `trazabilidad-channel`.
3. En Trazaap, crea una recepcion de materia prima.
4. El backend guarda la recepcion e inspeccion en PostgreSQL.
5. El backend registra automaticamente en Fabric:

```text
recepcion_materia_prima:<id_recepcion>
inspeccion_recepcion:<id_inspeccion>
```

6. Consulta el lote desde la vista de trazabilidad.
7. La respuesta incluye `validacionesBlockchain` con:

- `VERIFICADO`: el hash actual coincide con Fabric.
- `ALTERADO`: el registro operativo cambio y ya no coincide.
- `NO_ENCONTRADO`: no hay evidencia para ese evento.
- `PENDIENTE`: Fabric no esta disponible o falta configurar la red.

## Validacion Manual Con Peer CLI

Ejemplo conceptual para consultar un evento:

```bash
peer chaincode query \
  -C trazaapchannel \
  -n trazaap \
  -c '{"Args":["consultarEvento","recepcion_materia_prima","15"]}'
```

Ejemplo conceptual para validar un hash:

```bash
peer chaincode query \
  -C trazabilidad-channel \
  -n traceability \
  -c '{"Args":["validarEvento","recepcion_materia_prima","15","PAYLOAD_ACTUAL_JSON"]}'
```

El `PAYLOAD_ACTUAL_JSON` normalmente no se arma a mano; lo construye el backend desde el registro operativo normalizado. El hash de comparacion lo calcula el chaincode.
