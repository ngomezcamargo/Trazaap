# Demo Hyperledger Fabric en Trazaap

Esta guia resume como probar la integracion actual de Trazaap con Hyperledger Fabric.

## Arquitectura

Trazaap mantiene los datos completos en PostgreSQL y usa Fabric como capa de evidencia criptografica.

```text
Registro operativo en PostgreSQL
-> Backend normaliza el registro
-> Backend calcula SHA-256
-> Chaincode guarda el hash inmutable
-> Consulta de trazabilidad recalcula y valida contra Fabric
```

No existe tabla PostgreSQL para duplicar bloques, hashes, payloads del ledger ni evidencia blockchain.

## Chaincode

El chaincode esta en:

```text
fabric/chaincode/traceability
```

Funciones principales:

- `registrarEvento(tipoEvento, idEntidad, lote, hashRegistro, fechaEvento, actor)`
- `validarEvento(tipoEvento, idEntidad, hashActual)`
- `consultarEvento(tipoEvento, idEntidad)`
- `consultarEventosPorLote(lote)`

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
FABRIC_CHANNEL_NAME=trazaapchannel
FABRIC_CHAINCODE_NAME=trazaap
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.trazaap.local
FABRIC_TLS_CERT_PATH=../fabric/organizations/peerOrganizations/org1.trazaap.local/peers/peer0.org1.trazaap.local/tls/ca.crt
FABRIC_CERT_PATH=../fabric/organizations/peerOrganizations/org1.trazaap.local/users/Admin@org1.trazaap.local/msp/signcerts/cert.pem
FABRIC_KEY_PATH=../fabric/organizations/peerOrganizations/org1.trazaap.local/users/Admin@org1.trazaap.local/msp/keystore/priv_sk
```

Si `FABRIC_ENABLED=false` o la red no esta disponible, el registro operativo no se rompe: la evidencia queda como `PENDIENTE` en la respuesta del backend, sin crear tablas locales de respaldo.

## Flujo De Prueba

1. Levanta PostgreSQL, backend, frontend y la red Fabric.
2. Despliega el chaincode `trazaap` en el canal `trazaapchannel`.
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
  -C trazaapchannel \
  -n trazaap \
  -c '{"Args":["validarEvento","recepcion_materia_prima","15","HASH_ACTUAL"]}'
```

El `HASH_ACTUAL` normalmente no se calcula a mano; lo calcula el backend desde el registro operativo normalizado.
