# Trazaap

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
- Controlar ingreso, seguimiento y salida de almacenamiento antes de la liberacion
- Generar automaticamente lotes unicos por producto y fecha de produccion
- Comparar tiempos y temperaturas estandar contra valores reales
- Generar lote producido desde el registro de manufactura
- Registrar liberacion de producto
- Gestionar clientes comerciales sin convertirlos en usuarios internos
- Registrar despachos parciales de uno o varios lotes y confirmar su entrega
- Consultar trazabilidad extendida por lote (recepcion, inspeccion, produccion, liberacion, despacho, blockchain)

## Stack actual

- Frontend: Next.js + React
- Backend: Node.js + Express
- Base de datos: PostgreSQL
- Autenticacion: JWT
- Permisos: RBAC interno con roles `administrador`, `gerente` y `operario`
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
    almacenamiento/
    liberacion/
    clientes/
    despachos/
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
|   |   |   |-- almacenamiento/
|   |   |   |-- liberacion/
|   |   |   |-- clientes/
|   |   |   |-- despachos/
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

La matriz de permisos vigente esta documentada en [docs/MATRIZ_RBAC.md](docs/MATRIZ_RBAC.md). Las rutas privadas requieren JWT y autorizacion por rol; las rutas publicas viven bajo `/public`. El alcance de informacion para consumidor final, cliente e INVIMA esta documentado en [docs/ACCESO_EXTERNO.md](docs/ACCESO_EXTERNO.md). El flujo de evidencia y validacion Fabric esta documentado en [docs/VALIDACION_BLOCKCHAIN.md](docs/VALIDACION_BLOCKCHAIN.md).

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
- `GET /almacenamiento/pendientes`
- `GET /almacenamiento`
- `GET /almacenamiento/:id`
- `POST /almacenamiento/ingresos`
- `POST /almacenamiento/:id/controles`
- `POST /almacenamiento/:id/salida`
- `POST /almacenamiento/:id/resolucion`
- `GET /almacenamiento/ubicaciones`
- `POST /almacenamiento/ubicaciones`
- `PUT /almacenamiento/ubicaciones/:id`
- `GET /liberacion`
- `POST /liberacion`
- `GET /clientes`
- `GET /clientes/:id`
- `POST /clientes`
- `PUT /clientes/:id`
- `GET /despachos/inventario-disponible`
- `GET /despachos`
- `GET /despachos/:id`
- `POST /despachos`
- `GET /public/traceability/lote/:lote`
- `GET /public/traceability/cliente?lote=<lote>&factura=<factura>`
- `GET /public/traceability/cliente?lote=<lote>&codigo=<codigo_cliente>`
- `POST /public/traceability/cliente/confirmar`
- `GET /public/traceability/auditoria?lote=<lote>&codigo=<codigo_auditoria>`

## Blockchain Hyperledger Fabric

Guia de demo paso a paso: [docs/demo-hyperledger-fabric.md](docs/demo-hyperledger-fabric.md).

La arquitectura de integridad es:

```text
PostgreSQL operativo -> Backend -> Payload normalizado -> Hyperledger Fabric / Chaincode
```

PostgreSQL conserva solo la informacion operativa del sistema. No guarda hashes, bloques ni evidencia blockchain. Fabric conserva la evidencia criptografica minima:

- `tipoEvento`
- `idEntidad`
- `lote`
- `hashRegistro`
- `fechaEvento`
- `actor`
- `timestampBlockchain`

El backend construye un payload estable y normalizado desde los registros operativos. El chaincode calcula `hashRegistro` con SHA-256, almacena la evidencia y expone:

- `registrarEvento`
- `validarEvento`
- `consultarEvento`
- `consultarEventosPorLote`
- `registrarCorreccionEvento`
- `consultarHistorialEvento`
- `validarDespacho`
- `registrarDespacho`
- `inicializarInventarioProductoTerminado`
- `consultarSaldoInventario`
- `confirmarRecepcionCliente`
- `registrarAlertaVencimiento`

En la consulta de trazabilidad, el backend reconstruye el payload actual y Fabric responde si el registro esta `VERIFICADO`, `ALTERADO`, `PENDIENTE` o `NO_ENCONTRADO`.

Desde la version 2.2 (secuencia 4), `registrarEvento` rechaza cualquier clave existente. Las correcciones se guardan como eventos nuevos que referencian el original y la validacion reconoce como vigente la ultima correccion inmutable autorizada. La aprobacion del despacho falla de forma cerrada si Fabric no esta disponible o si el chaincode detecta vencimiento, inventario insuficiente, controles de produccion fuera de rango o validaciones no conformes. El cliente receptor confirma la entrega desde el portal QR mediante factura o codigo, sin una cuenta interna.

Desde la version 2.3 (secuencia 5), el despacho exige que el lote haya completado el almacenamiento y tenga estado `listo_para_liberacion`. El modulo registra de forma separada el ingreso, los controles de conservacion y la salida. Las temperaturas esperadas pertenecen a la ficha del producto; una desviacion no borra el dato ni bloquea su registro, pero exige observacion y retiene el lote hasta una resolucion gerencial documentada.

Desde la version 2.4 (secuencia 6), liberacion y despacho son operaciones independientes. Una liberacion aprobada inicializa en Fabric el saldo del inventario terminado; cada despacho puede consumir parcialmente uno o varios lotes, pertenece a un cliente y una factura, y conserva las condiciones de transporte. El chaincode descuenta el saldo inmutable y rechaza `LOTE_SIN_EXISTENCIAS`, `STOCK_INSUFICIENTE` y `DESPACHO_DUPLICADO`. PostgreSQL mantiene saldos operativos de unidades liberadas, reservadas, despachadas y disponibles para soportar concurrencia y recuperacion mediante outbox.

La implementacion de RF05 esta descrita en [docs/RF05_DESPACHOS_PARCIALES.md](docs/RF05_DESPACHOS_PARCIALES.md).

La entrega de evidencias ordinarias a Fabric usa una bandeja tecnica `blockchain_outbox`. La misma transaccion PostgreSQL que guarda el evento operativo deja una referencia de entrega pendiente; un trabajador del backend reconstruye el payload desde las tablas del dominio y reintenta con espera exponencial. La bandeja no almacena payloads, hashes ni bloques, por lo que PostgreSQL no duplica el ledger. Los registros se reclaman con bloqueo concurrente y una clave de deduplicacion evita enviar dos veces el mismo evento.

El backend revisa cada hora los lotes con unidades disponibles que alcanzaron su vencimiento. `registrarAlertaVencimiento` conserva una sola alerta inmutable por lote y el dashboard gerencial muestra la alerta operativa.

### Red Fabric local

La red de desarrollo esta en `fabric/` y usa:

- 1 CA: `ca.trazaap.local`
- 1 orderer: `orderer.trazaap.local`
- 2 peers: `peer0.org1.trazaap.local` y `peer1.org1.trazaap.local`
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
./scripts/status.sh
```

El despliegue instala el paquete en `peer0` y `peer1`, aprueba la definicion para `Org1MSP` y la confirma en `trazabilidad-channel`. Una actualizacion normal no debe ejecutar `clean.sh`, borrar volumenes, regenerar certificados ni recrear el canal.

Pruebas del chaincode:

```bash
cd fabric/chaincode/traceability
npm test
```

Prueba integral RF05 contra PostgreSQL y la red Fabric desplegada:

```bash
cd backend
npm run test:rf05
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

La semilla carga 19 fichas de producto basadas en el catalogo 2026 de Bagel Home. Los pesos y presentaciones provienen del catalogo; los tiempos de Bagel, pan trenza, pan sandwich y pan molde toman como referencia el formato operativo de produccion. Los demas tiempos y la receta base de harina son valores provisionales para pruebas y deben reemplazarse cuando la empresa valide las formulaciones oficiales.

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
- `ubicaciones_almacenamiento`
- `almacenamientos_lote`
- `controles_almacenamiento`
- `blockchain_outbox` (solo estado tecnico de entrega; sin payload ni hash)
- `tiempos_produccion`
- `liberaciones_producto`
