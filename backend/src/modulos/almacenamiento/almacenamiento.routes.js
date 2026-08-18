import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  actualizarUbicacionController,
  crearControlController,
  crearIngresoController,
  crearUbicacionController,
  listarAlmacenamientosController,
  listarPendientesController,
  listarUbicacionesController,
  obtenerAlmacenamientoController,
  registrarSalidaController,
  resolverRetencionController
} from './almacenamiento.controller.js';
import {
  controlAlmacenamientoSchema,
  ingresoAlmacenamientoSchema,
  resolucionAlmacenamientoSchema,
  salidaAlmacenamientoSchema,
  ubicacionSchema
} from './almacenamiento.schemas.js';

const router = Router();
router.use(autenticarJwt);
router.get('/pendientes', rolesMiddleware('gerente', 'operario'), manejarAsync(listarPendientesController));
router.get('/ubicaciones', rolesMiddleware('gerente', 'operario'), manejarAsync(listarUbicacionesController));
router.post('/ubicaciones', rolesMiddleware('administrador'), validarSolicitud(ubicacionSchema), manejarAsync(crearUbicacionController));
router.put('/ubicaciones/:id', rolesMiddleware('administrador'), validarSolicitud(ubicacionSchema), manejarAsync(actualizarUbicacionController));
router.get('/', rolesMiddleware('gerente', 'operario'), manejarAsync(listarAlmacenamientosController));
router.get('/:id', rolesMiddleware('gerente', 'operario'), manejarAsync(obtenerAlmacenamientoController));
router.post('/ingresos', rolesMiddleware('operario'), validarSolicitud(ingresoAlmacenamientoSchema), manejarAsync(crearIngresoController));
router.post('/:id/controles', rolesMiddleware('operario'), validarSolicitud(controlAlmacenamientoSchema), manejarAsync(crearControlController));
router.post('/:id/salida', rolesMiddleware('operario'), validarSolicitud(salidaAlmacenamientoSchema), manejarAsync(registrarSalidaController));
router.post('/:id/resolucion', rolesMiddleware('gerente'), validarSolicitud(resolucionAlmacenamientoSchema), manejarAsync(resolverRetencionController));

export default router;
