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
- Registrar manufactura real por producto producido
- Comparar tiempos y temperaturas estandar contra valores reales
- Generar lote producido desde el registro de manufactura
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
- `GET /auth/operarios`
- `GET /providers`
- `POST /providers`
- `GET /providers/:id`
- `PUT /providers/:id`
- `DELETE /providers/:id`
- `GET /receptions`
- `POST /receptions`
- `GET /receptions/:id/detalle`
- `GET /inventario-insumos`
- `GET /materias-primas`
- `POST /materias-primas`
- `PUT /materias-primas/:id`
- `GET /traceability/lote/:lote`
- `POST /traceability/events`
- `GET /traceability/lots/:codigoLote/events`
- `GET /traceability/events/:eventId/fabric`
- `GET /traceability/lots/:codigoLote/verify`
- `GET /produccion/ordenes`
- `GET /produccion/ordenes/:id`
- `GET /produccion/productos`
- `GET /produccion/productos/:productoId`
- `GET /produccion/recepciones-disponibles`
- `POST /produccion/ordenes`
- `POST /produccion/productos`
- `PUT /produccion/productos/:productoId`
- `POST /produccion/calcular-insumos`
- `PUT /produccion/ordenes/:id/estado`
- `GET /produccion/manufactura/ordenes`
- `GET /produccion/ordenes/:id/productos/:productoId/manufactura`
- `POST /produccion/ordenes/:id/productos/:productoId/manufactura`
- `POST /produccion/ordenes/:id/materias`
- `PUT /produccion/ordenes/:id/materias/:materiaId`
- `POST /produccion/ordenes/:id/tiempos`
- `GET /liberacion`
- `POST /liberacion`

## Blockchain Hyperledger Fabric

Guia de demo paso a paso: [docs/demo-hyperledger-fabric.md](docs/demo-hyperledger-fabric.md).

La arquitectura de integridad es:

```text
PostgreSQL operativo -> Backend -> Hash SHA-256 normalizado -> Hyperledger Fabric
```

PostgreSQL conserva solo la informacion operativa del sistema. No guarda hashes, bloques ni evidencia blockchain. Fabric conserva la evidencia criptografica minima:

- `tipoEvento`
- `idEntidad`
- `lote`
- `hashRegistro`
- `fechaEvento`
- `actor`
- `timestampBlockchain`

El backend calcula `hashRegistro` con SHA-256 sobre una representacion estable y normalizada del registro operativo. El chaincode expone:

- `registrarEvento`
- `validarEvento`
- `consultarEvento`
- `consultarEventosPorLote`

En la consulta de trazabilidad, el backend recalcula el hash actual y Fabric responde si el registro esta `VERIFICADO`, `ALTERADO`, `PENDIENTE` o `NO_ENCONTRADO`.

### Red Fabric local

La red de desarrollo esta en `fabric/` y usa:

- 1 CA: `ca.trazaap.local`
- 1 orderer: `orderer.trazaap.local`
- 1 peer: `peer0.org1.trazaap.local`
- 1 organizacion: `Org1MSP`
- 1 canal: `trazaapchannel`
- 1 chaincode: `trazaap`

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
- role: `administrador`

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

3. Ejecutar migracion unica del esquema actual y datos semilla:

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
  - incluye `unidad_medida_base` (obligatoria), `tipo_insumo` (opcional) y `descripcion_unidad_personalizada`
- `receptions`
  - incluye `unidad_medida` para registrar cantidades en contexto (ej: `30 unidad`, `30 g`, `30 kg`)
- `reception_inspections`
- `inventario_materias_primas`
- `inventario_movimientos`
- `trazabilidad_eventos`
- `ordenes_produccion`
- `ordenes_produccion_productos` (incluye `observaciones` por producto para planificacion)
- `productos_fabricados`
- `producto_variantes`
- `producto_variante_materia_prima`
- `ordenes_produccion_materias`
- `registro_manufactura`
- `tiempos_produccion`
- `liberaciones_producto`
