# Trazaap - Base Simplificada Sprint 2

Trazaap queda refactorizado como una base academica limpia para Sprint 2, enfocada en operacion interna y trazabilidad extendida.

## Alcance Sprint 2

- Iniciar sesion
- Gestionar proveedores
- Registrar recepcion de materias primas
- Registrar inspeccion de producto y vehiculo dentro de la misma recepcion (modales)
- Gestionar catalogo de materias primas
- Gestionar ordenes de produccion diarias
- Orden de produccion basada en formato real de Angela's Bagels (encabezado, productos, ingredientes y mojes)
- Registrar consumo planificado/real y tiempos de produccion
- Registro de tiempos por carro/escabiladero con rangos de control
- Generar lote de producto terminado
- Registrar liberacion de producto
- Consultar trazabilidad extendida por lote (recepcion, inspeccion, produccion, liberacion, blockchain)

## Stack actual

- Frontend: Next.js + React
- Backend: Node.js + Express
- Base de datos: PostgreSQL
- Autenticacion: JWT
- Blockchain: Hyperledger Fabric local como capa de auditoria minima
- Integracion Fabric: backend con Fabric Gateway SDK hacia chaincode `traceability`

Sin MongoDB. PostgreSQL sigue guardando los datos completos del sistema.

## Arquitectura backend (modular por dominio)

El backend sigue una arquitectura modular por dominio:

`Frontend Web -> Middlewares globales -> Modulos de dominio (routes/controller/service/repository)`.

Estructura objetivo aplicada en `backend/src`:

```text
src/
  configuracion/
  middlewares/
  utilidades/
  modulos/
    autenticacion/
    proveedores/
    materias_primas/
    recepciones/
    produccion/
    liberacion/
    trazabilidad/
    blockchain/
  app.js
  server.js
```

## Estructura del proyecto

```text
.
|-- backend/
|   |-- src/
|   |   |-- configuracion/
|   |   |-- middlewares/
|   |   |-- modulos/
|   |   |   |-- autenticacion/
|   |   |   |-- blockchain/
|   |   |   |-- proveedores/
|   |   |   |-- produccion/
|   |   |   |-- recepciones/
|   |   |   |-- materias_primas/
|   |   |   |-- liberacion/
|   |   |   `-- trazabilidad/
|   |   |-- app.js
|   |   `-- server.js
|   |-- scripts/
|   `-- sql/
|-- frontend/
|   `-- src/
|       |-- app/
|       |-- comunes/
|       |-- modulos/
|       |-- servicios/
|       `-- utilidades/
|-- docker-compose.yml
|-- fabric/
|   |-- chaincode/traceability/
|   |-- configtx/
|   |-- docker-compose.fabric.yml
|   `-- scripts/
`-- .env.example
```

## Endpoints principales

Base URL backend: `http://localhost:4000/api`

- `POST /auth/login`
- `GET /auth/me`
- `GET /providers`
- `POST /providers`
- `GET /providers/:id`
- `PUT /providers/:id`
- `DELETE /providers/:id`
- `GET /receptions`
- `POST /receptions`
- `GET /materias-primas`
- `POST /materias-primas`
- `PUT /materias-primas/:id`
- `GET /traceability/lote/:lote`
- `POST /traceability/events`
- `GET /traceability/lots/:codigoLote/events`
- `GET /traceability/events/:eventId/fabric`
- `GET /traceability/lots/:codigoLote/verify`
- `GET /produccion/ordenes`
- `GET /produccion/recepciones-disponibles`
- `POST /produccion/ordenes`
- `POST /produccion/ordenes/:id/materias`
- `POST /produccion/ordenes/:id/tiempos`
- `POST /produccion/ordenes/:id/mojes`
- `GET /liberacion`
- `POST /liberacion`

## Blockchain Hyperledger Fabric

Guia de demo paso a paso: [docs/demo-hyperledger-fabric.md](docs/demo-hyperledger-fabric.md).

La arquitectura de auditoria es:

```text
Frontend -> Backend -> FabricTraceabilityService -> Hyperledger Fabric
```

PostgreSQL conserva el evento completo en `traceability_events`. Fabric conserva solo evidencia minima:

- `eventId`
- `codigoLote`
- `tipoEvento`
- `hashEvento`
- `hashAnterior`
- `timestamp`
- `responsable`

El backend calcula `hashEvento` con SHA-256 sobre una representacion estable de:

- `codigoLote`
- `tipoEvento`
- `descripcion`
- `responsable`
- `fechaEvento`
- `datosEvento`
- `hashAnterior`

`hashAnterior` es el ultimo `hashEvento` registrado para el mismo lote. Para el primer evento del lote es `null`.

### Red Fabric local

La red de desarrollo esta en `fabric/` y usa:

- 1 CA: `ca.trazaap.local`
- 1 orderer: `orderer.trazaap.local`
- 1 peer: `peer0.org1.trazaap.local`
- 1 organizacion: `Org1MSP`
- 1 canal: `trazabilidad-channel`
- 1 chaincode: `traceability`

Requisitos previos:

- Docker y Docker Compose
- Node.js 18+
- Binarios de Hyperledger Fabric en PATH: `peer`, `configtxgen`, `osnadmin`, `fabric-ca-client`

Comandos:

```bash
cd fabric
./scripts/start.sh
./scripts/create-channel.sh
./scripts/deploy-chaincode.sh
```

Detener red:

```bash
cd fabric
./scripts/stop.sh
```

Limpiar volumenes y artefactos de desarrollo:

```bash
cd fabric
./scripts/clean.sh
```

## Usuario semilla

- email: `admin@trazaap.local`
- password: `Admin123*`
- role: `admin`

## Variables de entorno

Usa `.env.example` como referencia para crear los archivos locales de entorno.

Archivos locales esperados:

- Backend: `backend/.env`
- Frontend: `frontend/.env.local`

No se deben versionar archivos `.env`, certificados, claves privadas ni artefactos generados por Fabric.

## Puesta en marcha

1. Instalar dependencias:

```bash
cd backend
npm install
cd ..\frontend
npm install
```

2. Crear base de datos `trazaap` en PostgreSQL.

3. Ejecutar migraciones y seed:

```bash
cd backend
npm run migrate
npm run seed
```

4. Levantar backend:

```bash
cd backend
npm run dev
```

Para probar la integracion Fabric, levanta antes la red Fabric y despliega el chaincode.

5. Levantar frontend:

```bash
cd frontend
npm run dev
```

6. Abrir `http://localhost:3000`.

## Docker local

El `docker-compose.yml` incluye PostgreSQL. La red Fabric local se levanta con `fabric/docker-compose.fabric.yml` mediante los scripts de `fabric/scripts`.

## Ejemplos API Fabric

Primero inicia sesion y conserva el token:

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@trazaap.local","password":"Admin123*"}'
```

Crear evento auditable:

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

Consultar eventos del lote desde base de datos y, si Fabric esta disponible, tambien desde Fabric:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/traceability/lots/L-2026-001/events
```

Consultar evidencia directa desde Fabric:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/traceability/events/$EVENT_ID/fabric
```

Verificar integridad del lote:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/traceability/lots/L-2026-001/verify
```

Respuesta esperada:

```json
{
  "codigoLote": "L-2026-001",
  "integridadValida": true,
  "eventosVerificados": 4,
  "errores": []
}
```

## Modelo de datos

Tablas base de Sprint 2:

- `roles`
- `users`
- `providers`
- `raw_materials`
- `receptions`
- `reception_inspections`
- `trazabilidad_eventos`
- `eventos_blockchain`
- `traceability_events`
- `ordenes_produccion`
- `ordenes_produccion_materias`
- `tiempos_produccion`
- `lotes_producto_terminado`
- `liberaciones_producto`
