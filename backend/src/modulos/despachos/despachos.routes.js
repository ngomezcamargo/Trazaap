import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  consultarDespachoController,
  crearDespachoController,
  listarDespachosController,
  listarInventariosDespachablesController
} from './despachos.controller.js';
import { crearDespachoSchema } from './despachos.schemas.js';

const router = Router();
router.use(autenticarJwt);

router.get('/inventario-disponible', rolesMiddleware('gerente', 'operario'), manejarAsync(listarInventariosDespachablesController));
router.get('/', rolesMiddleware('gerente', 'operario'), manejarAsync(listarDespachosController));
router.get('/:id', rolesMiddleware('gerente', 'operario'), manejarAsync(consultarDespachoController));
router.post('/', rolesMiddleware('operario'), validarSolicitud(crearDespachoSchema), manejarAsync(crearDespachoController));

export default router;
