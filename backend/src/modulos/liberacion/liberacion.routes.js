import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  crearLiberacionController,
  listarAlertasVencimientoController,
  listarLiberacionesController,
  listarPendientesLiberacionController
} from './liberacion.controller.js';
import { crearLiberacionSchema } from './liberacion.schemas.js';

const router = Router();
router.use(autenticarJwt);

router.get('/pendientes', rolesMiddleware('gerente', 'operario'), manejarAsync(listarPendientesLiberacionController));
router.get('/alertas-vencimiento', rolesMiddleware('administrador', 'gerente'), manejarAsync(listarAlertasVencimientoController));
router.get('/', rolesMiddleware('gerente', 'operario'), manejarAsync(listarLiberacionesController));
router.post('/', rolesMiddleware('operario'), validarSolicitud(crearLiberacionSchema), manejarAsync(crearLiberacionController));

export default router;
