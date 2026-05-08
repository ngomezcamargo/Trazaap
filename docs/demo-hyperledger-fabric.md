# Demo Hyperledger Fabric en Trazaap

Esta guia explica como probar la demo funcional de blockchain en Trazaap. La integracion usa Hyperledger Fabric como capa de auditoria para eventos de trazabilidad de lotes alimentarios.

## 1. Que Hace La Integracion

Trazaap registra eventos de trazabilidad en PostgreSQL y envia a Hyperledger Fabric una evidencia minima e inmutable.

El flujo actual es:

```text
Frontend o curl
-> Backend Express
-> PostgreSQL
-> FabricTraceabilityService
-> Hyperledger Fabric
```

Fabric no reemplaza la base de datos. Fabric solo permite auditar que un evento existia con un hash especifico, en un momento especifico, dentro del ledger.

## 2. Datos En PostgreSQL

PostgreSQL conserva el evento completo en la tabla `traceability_events`.

Campos principales:

- `id`
- `codigo_lote`
- `tipo_evento`
- `descripcion`
- `responsable`
- `fecha_evento`
- `datos_evento`
- `hash_evento`
- `hash_anterior`
- `fabric_tx_id`
- `fabric_block_number`
- `fabric_status`
- `fabric_error`
- `created_at`

PostgreSQL sigue siendo la fuente principal de los datos de negocio.

## 3. Datos En Hyperledger Fabric

Fabric conserva solo evidencia minima:

- `eventId`
- `codigoLote`
- `tipoEvento`
- `hashEvento`
- `hashAnterior`
- `timestamp`
- `responsable`
- `txId`

No se guarda el payload completo del evento en Fabric.

## 4. Por Que Fabric No Reemplaza PostgreSQL

PostgreSQL guarda datos completos, consultables y operativos. Fabric guarda una prueba de integridad.

Esto evita:

- duplicar toda la base de datos en blockchain
- exponer datos sensibles en el ledger
- hacer consultas operativas lentas o costosas sobre Fabric
- acoplar el frontend directamente a blockchain

La responsabilidad queda separada:

```text
PostgreSQL = datos completos del sistema
Fabric = evidencia minima e inmutable
```

## 5. Requisitos Previos

- Docker y Docker Compose
- Node.js 18 o superior
- Binarios de Hyperledger Fabric disponibles en `PATH` o en `fabric/bin`

Binarios requeridos:

```bash
peer
configtxgen
osnadmin
fabric-ca-client
```

Verificacion:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/fabric
source ./scripts/env.sh

peer version
configtxgen --version
osnadmin version
fabric-ca-client version
```

## 6. Variables De Entorno

Usa `.env.example` como referencia.

No copies certificados, claves privadas ni valores sensibles a la documentacion. Cada entorno local debe tener su propio `backend/.env`.

Archivos de entorno:

- Backend: copiar `.env.example` hacia `backend/.env` y ajustar valores locales.
- Frontend: copiar la seccion frontend hacia `frontend/.env.local`.

La integracion Fabric requiere estas variables, ya listadas en `.env.example`:

- `FABRIC_ENABLED`
- `FABRIC_MSP_ID`
- `FABRIC_CHANNEL_NAME`
- `FABRIC_CHAINCODE_NAME`
- `FABRIC_PEER_ENDPOINT`
- `FABRIC_PEER_HOST_ALIAS`
- `FABRIC_TLS_CERT_PATH`
- `FABRIC_CERT_PATH`
- `FABRIC_KEY_PATH`

## 7. Instalar Dependencias

Backend:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/backend
npm install
```

Frontend:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/frontend
npm install
```

## 8. Levantar PostgreSQL

Desde la raiz del proyecto:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap
docker compose up -d postgres
```

Verificar:

```bash
docker compose ps postgres
```

## 9. Correr Migraciones Y Seed

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/backend
npm run migrate
npm run seed
```

La migracion importante para esta demo es:

```text
backend/sql/003_traceability_fabric_events.sql
```

## 10. Levantar La Red Fabric

Desde `fabric/`:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/fabric
./scripts/start.sh
```

Este script levanta:

- CA
- orderer
- peer
- identidades locales de desarrollo

## 11. Crear El Canal

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/fabric
./scripts/create-channel.sh
```

Canal esperado:

```text
trazabilidad-channel
```

Verificar que el peer se unio:

```bash
source ./scripts/env.sh
peer channel list
```

Resultado esperado:

```text
Channels peers has joined:
trazabilidad-channel
```

## 12. Desplegar El Chaincode

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/fabric
./scripts/deploy-chaincode.sh
```

Chaincode esperado:

```text
traceability
```

Funciones disponibles en el chaincode:

- `RegisterTraceabilityEvent`
- `GetTraceabilityEvent`
- `GetEventsByLot`
- `EventExists`
- `GetAllEvents`

Prueba directa:

```bash
source ./scripts/env.sh
peer chaincode query \
  -C trazabilidad-channel \
  -n traceability \
  -c '{"Args":["EventExists","test-event"]}'
```

Resultado esperado:

```text
false
```

Si ya habias desplegado una version anterior del chaincode y necesitas desplegar cambios nuevos sobre la misma red, aumenta version y secuencia:

```bash
CHAINCODE_VERSION=1.1 CHAINCODE_SEQUENCE=2 ./scripts/deploy-chaincode.sh
```

En una red limpia despues de `./scripts/clean.sh`, la version por defecto `1.0` y secuencia `1` son suficientes.

## 13. Correr Backend Y Frontend

Backend:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/backend
npm run dev
```

Frontend:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/frontend
npm run dev
```

URLs esperadas:

- Backend: `http://localhost:4000/api`
- Frontend: `http://localhost:3000`

La demo blockchain se puede probar por `curl` o desde la UI minima en `/blockchain`.

## 14. Hacer Login

Usuario semilla:

- email: `admin@trazaap.local`
- password: `Admin123*`

Login:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@trazaap.local","password":"Admin123*"}' \
  | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>console.log(JSON.parse(data).token))")

echo "$TOKEN"
```

Si prefieres, puedes hacer el login manualmente y copiar el token de la respuesta.

## 15. Crear Un Evento De Trazabilidad

Ejemplo con lote `L-2026-001`:

```bash
curl -X POST http://localhost:4000/api/traceability/events \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "codigoLote": "L-2026-001",
    "tipoEvento": "RECEPCION_MATERIA_PRIMA",
    "descripcion": "Recepcion de harina de trigo",
    "responsable": "admin@trazaap.local",
    "datosEvento": {
      "proveedor": "Proveedor demo",
      "cantidad": 25,
      "unidad": "kg"
    }
  }'
```

Resultado esperado:

```json
{
  "codigoLote": "L-2026-001",
  "tipoEvento": "RECEPCION_MATERIA_PRIMA",
  "hashAnterior": null,
  "fabricTxId": "valor-generado-por-fabric",
  "fabricStatus": "registrado",
  "fabricError": null
}
```

El JSON real tendra mas campos, como `id`, `hashEvento`, `fechaEvento`, `createdAt` y `fabricBlockNumber`.

Guarda el `id` devuelto como `EVENT_ID`:

```bash
EVENT_ID="pega-aqui-el-id-devuelto"
```

## 16. Crear Un Segundo Evento Para Probar La Cadena

```bash
curl -X POST http://localhost:4000/api/traceability/events \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "codigoLote": "L-2026-001",
    "tipoEvento": "CONTROL_CALIDAD",
    "descripcion": "Control de calidad posterior a recepcion",
    "responsable": "admin@trazaap.local",
    "datosEvento": {
      "resultado": "aprobado",
      "temperatura": 18,
      "observaciones": "Sin hallazgos"
    }
  }'
```

Resultado esperado:

- `fabricStatus` debe ser `registrado`
- `fabricTxId` debe tener valor
- `hashAnterior` debe ser igual al `hashEvento` del primer evento del lote

## 17. Consultar Evidencia Directamente Desde Fabric

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/traceability/events/$EVENT_ID/fabric
```

Resultado esperado:

```json
{
  "eventId": "id-del-evento",
  "codigoLote": "L-2026-001",
  "tipoEvento": "RECEPCION_MATERIA_PRIMA",
  "hashEvento": "hash-sha256-del-evento",
  "hashAnterior": null,
  "timestamp": "fecha-del-evento",
  "responsable": "admin@trazaap.local",
  "txId": "transaction-id-de-fabric"
}
```

## 18. Consultar Eventos Del Lote

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/traceability/lots/L-2026-001/events
```

Este endpoint devuelve:

- eventos completos desde PostgreSQL
- evidencia disponible desde Fabric

## 19. Verificar Integridad Del Lote

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/traceability/lots/L-2026-001/verify
```

Resultado esperado con dos eventos validos:

```json
{
  "codigoLote": "L-2026-001",
  "integridadValida": true,
  "eventosVerificados": 2,
  "errores": []
}
```

La verificacion hace tres cosas:

- recalcula `hashEvento` desde PostgreSQL
- compara `hashAnterior` entre eventos del mismo lote
- consulta Fabric y compara la evidencia registrada contra la base de datos

## 20. Probar Desde La UI

Con backend, frontend, PostgreSQL y Fabric levantados:

1. Abre `http://localhost:3000/blockchain`.
2. Inicia sesion con el usuario semilla si todavia no hay sesion activa.
3. Usa el lote `L-2026-001`.
4. Presiona `Listar eventos` para cargar lo existente.
5. Presiona `Crear evento` para registrar un evento nuevo.
6. Presiona `Fabric` en una fila para consultar la evidencia directa desde Fabric.
7. Presiona `Verificar lote` para validar la cadena de hashes y la evidencia en Fabric.

Resultado esperado en la UI:

- `fabricStatus` debe aparecer como `registrado`.
- `fabricTxId` debe tener un valor abreviado.
- `hashAnterior` debe ser `-` para el primer evento del lote.
- `hashAnterior` debe apuntar al hash anterior cuando haya mas eventos del mismo lote.
- La verificacion debe mostrar integridad `valida` y errores `[]`.

## 21. Pruebas Unitarias

El backend incluye pruebas unitarias ligeras para el hash de trazabilidad. No levantan Fabric ni PostgreSQL.

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/backend
npm test
```

Estas pruebas cubren:

- hash estable aunque cambie el orden de claves de `datosEvento`
- cambio de hash si cambia un campo del evento
- validacion de `hashAnterior` entre eventos del lote
- deteccion de `hashAnterior` invalido

## 22. Errores Comunes

### `Config File "core" Not Found`

Carga el entorno Fabric antes de usar el CLI `peer`:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/fabric
source ./scripts/env.sh
```

### `Cannot run peer because could not get peer BCCSP configuration`

Verifica que `fabric/configtx/core.yaml` exista y que hayas ejecutado:

```bash
source ./scripts/env.sh
```

### `x509: certificate signed by unknown authority`

Limpia y regenera artefactos de desarrollo:

```bash
./scripts/clean.sh
./scripts/start.sh
./scripts/create-channel.sh
./scripts/deploy-chaincode.sh
```

### `chaincode definition already committed`

Si estas actualizando chaincode sin limpiar la red, aumenta version y secuencia:

```bash
CHAINCODE_VERSION=1.1 CHAINCODE_SEQUENCE=2 ./scripts/deploy-chaincode.sh
```

### `fabricStatus` queda en `error`

Revisa:

- que la red Fabric este levantada
- que el canal exista
- que el chaincode este desplegado
- que `backend/.env` tenga las variables Fabric basadas en `.env.example`

## 23. Limitaciones Actuales

- La red Fabric es solo local/desarrollo.
- Hay una sola organizacion: `Org1MSP`.
- No hay nodos de INVIMA, clientes ni proveedores.
- No hay canales privados.
- La UI frontend actual es minima y solo cubre la demo auditable.
- Las pruebas automatizadas actuales son unitarias; no levantan Fabric ni PostgreSQL.
- Hay dos modelos de auditoria conviviendo:
  - `eventos_blockchain`: flujo anterior basado en hash local.
  - `traceability_events`: flujo nuevo integrado con Fabric Gateway.
- Los artefactos generados de Fabric no deben versionarse:
  - `fabric/organizations`
  - `fabric/fabric-ca`
  - `fabric/channel-artifacts`
  - `fabric/chaincode-packages`
  - `fabric/bin`
  - logs locales

## 24. Trabajo Futuro

- Integrar la UI de eventos auditables con flujos reales de recepcion, produccion, calidad y despacho.
- Agregar pruebas de integracion opcionales contra Fabric local.
- Agregar una vista de solo lectura para auditores internos.
- Definir politica de upgrade del chaincode para demos sucesivas.
- Resolver la convivencia entre `eventos_blockchain` y `traceability_events`.

## 25. Detener O Limpiar La Red

Detener contenedores:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/fabric
./scripts/stop.sh
```

Limpiar volumenes y artefactos de desarrollo:

```bash
cd /home/sunrider/Proyectos/Software/TrazaapHyperledger/Trazaap/fabric
./scripts/clean.sh
```

`clean.sh` elimina artefactos locales de Fabric. No elimina PostgreSQL ni codigo fuente.
