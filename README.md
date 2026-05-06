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
- Blockchain: modulo desacoplado con hash SHA-256
- Integracion objetivo: Hyperledger Fabric (`backend/src/modulos/blockchain/fabric.client.js` preparado)

Sin MongoDB. La red real de Fabric queda para siguientes sprints.

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
- `POST /produccion/ordenes/:id/materias`
- `PUT /produccion/ordenes/:id/materias/:materiaId`
- `POST /produccion/ordenes/:id/tiempos`
- `GET /liberacion`
- `POST /liberacion`

## Blockchain en Sprint 2

- Eventos criticos registrados: recepcion (incluye inspecciones), produccion y liberacion.
- Produccion incluye: productos, materias primas, lotes usados, cantidades reales, unidades y tiempos/temperaturas.
- Liberacion incluye: producto, lote, vencimiento, unidades, peso neto, estado y responsable.
- Cada evento genera hash `SHA-256` sobre el payload completo.
- Persistencia en PostgreSQL en `eventos_blockchain`.
- `backend/src/modulos/blockchain/blockchain.adapter.js` es el punto de integracion futura con el SDK de Hyperledger Fabric.

## Usuario semilla

- email: `admin@trazaap.local`
- password: `Admin123*`
- role: `administrador`

## Variables de entorno

`backend/.env`:

```bash
NODE_ENV=development
PORT=4000
API_PREFIX=/api
JWT_SECRET=change_this_jwt_secret
JWT_EXPIRES_IN=8h

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=trazaap
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

`frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

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

5. Levantar frontend:

```bash
cd frontend
npm run dev
```

6. Abrir `http://localhost:3000`.

## Docker local

El `docker-compose.yml` incluye solo PostgreSQL.

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
- `eventos_blockchain`
- `ordenes_produccion`
- `ordenes_produccion_productos` (incluye `observaciones` por producto para planificacion)
- `productos_fabricados`
- `producto_variantes`
- `producto_variante_materia_prima`
- `ordenes_produccion_materias`
- `tiempos_produccion`
- `lotes_producto_terminado`
- `liberaciones_producto`
