# Matriz RBAC de Trazaap

RBAC significa control de acceso basado en roles. En Trazaap se definieron tres roles internos reales:

- `administrador`
- `gerente`
- `operario`

Los actores `INVIMA`, `cliente/receptor` y `consumidor final` no son usuarios internos del sistema. Su acceso se plantea mediante vistas publicas o controladas por lote, factura, QR o codigo de verificacion, sin permisos de escritura.

## Regla general

- Toda ruta privada exige JWT.
- Toda ruta privada debe tener autorizacion explicita por rol.
- Si no hay token o el token es invalido, la API responde `401`.
- Si el usuario esta autenticado pero no tiene permiso, la API responde `403`.
- El frontend oculta opciones no permitidas, pero la seguridad real se aplica en backend.

## Roles internos

| Modulo / accion | Administrador | Gerente | Operario |
| --- | --- | --- | --- |
| Dashboard | Consultar | Consultar | Consultar |
| Proveedores | Crear, consultar, editar, eliminar | Consultar | Sin acceso administrativo |
| Materias primas | Crear, consultar, editar | Consultar | Consulta tecnica desde flujos operativos |
| Recepciones | Consultar | Consultar | Crear y consultar |
| Detalle de recepciones | Consultar | Consultar | Consultar |
| Productos y recetas | Crear, consultar, editar | Consultar | Consultar desde produccion |
| Ordenes de produccion | Crear, consultar, editar estado y materias | Consultar | Consultar ordenes activas |
| Registro de manufactura | Puede operar por privilegio administrativo | No permitido | Registrar |
| Liberacion de producto | Puede operar por privilegio administrativo | Consultar | Registrar |
| Inventario | Consultar | Consultar | Sin acceso administrativo |
| Trazabilidad interna | Consultar | Consultar | Consultar |
| Reportes | Generar | Generar | No permitido |
| Usuarios operarios | Consultar para asignacion operativa | No permitido | Consultar para formularios operativos |

## Rutas publicas

Las rutas bajo `/api/public` no exigen JWT. Deben exponer solo informacion de consulta y no datos administrativos sensibles.

Actualmente la consulta publica de trazabilidad se usa para QR y portal externo del lote.

## Sesion

- El token JWT conserva la duracion configurada por `JWT_EXPIRES_IN`.
- El frontend cierra la sesion por inactividad despues de 2 horas.
- La actividad del usuario y las peticiones API renuevan el contador de inactividad.
- Al cerrarse por inactividad se limpia `localStorage` y se redirige a `/iniciar-sesion?motivo=inactividad`.

## Archivos principales

- Backend:
  - `backend/src/middlewares/autenticarJwt.js`
  - `backend/src/middlewares/roles.middleware.js`
  - `backend/src/modulos/*/*.routes.js`
- Frontend:
  - `frontend/src/utilidades/roles.js`
  - `frontend/src/utilidades/sesion.js`
  - `frontend/src/comunes/GuardiaSesion.js`
  - `frontend/src/comunes/GuardiaRol.js`
  - `frontend/src/comunes/BarraLateral.js`
