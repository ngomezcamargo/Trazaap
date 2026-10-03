# Limpieza tecnica del proyecto

## Resultado

Trazaap conserva la arquitectura actual por dominios y la funcionalidad implementada.
La base de datos tiene ahora una unica fuente SQL activa:

```text
backend/sql/001_schema_actual.sql
```

Ese archivo contiene el esquema operativo completo, con 32 tablas funcionales: usuarios,
proveedores, materias primas, recepciones, inventarios, produccion, almacenamiento,
liberacion, despachos, documentos, interoperabilidad y alertas.

El seed permanece separado en `backend/scripts/seed.js`. No se creo un `002_seed.sql`
duplicado, porque el seed necesita generar hashes de contrasena y resolver el catalogo
de productos de forma idempotente.

## Limpieza del esquema

El arranque actual utiliza exclusivamente `backend/sql/001_schema_actual.sql`. Los datos
iniciales se cargan mediante los scripts de seed del backend. El script elimina las tablas
retiradas `tiempos_produccion`, `producto_materia_prima`, `consecutivos_lote` y
`consecutivos_lote_fabrica`, que no tienen consumidores en la version vigente. Los datos
operativos de las tablas actuales se conservan.

## Artefactos retirados

Se retiraron del repositorio el `package-lock.json` de la raiz, que no tenia un
`package.json` asociado, la configuracion temporal vacia de Docker y un script temporal
del generador de matrices. Sus carpetas quedaron ignoradas por Git. Los documentos,
PDF, imagenes y hojas de calculo que sirven como evidencia academica se conservaron.

## Verificacion realizada

- `npm run migrate`: aplicado correctamente sobre la base local.
- `npm run test:integration:isolated`: verificado desde una base temporal con solo el esquema unico; incluye recepcion, manufactura, almacenamiento, liberacion, despachos parciales, concurrencia, Fabric y Excel.
- `npm test` en backend: 69 pruebas aprobadas y 4 omitidas por depender de servicios externos o configuracion opcional.
- `npm test` en `fabric/chaincode/traceability`: 18 pruebas aprobadas.
- `npm run build` en frontend: compilacion correcta de todas las rutas.
- `npm run test:epcis`: 2 pruebas aprobadas contra el esquema GS1 EPCIS 2.0.1.

Las pruebas de autenticacion se ejecutan con el JWT interno y RBAC. No se incluye
un proveedor externo de identidades porque no hace parte del alcance de la version
local.

## Instalacion limpia

```bash
cd backend
npm ci
npm run migrate
npm run seed
```

Luego se levantan el backend, el frontend y los servicios opcionales PostgreSQL, MinIO y
Fabric segun el entorno local.
