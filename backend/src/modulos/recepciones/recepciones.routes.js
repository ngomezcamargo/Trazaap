import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  crearRecepcionController,
  listarRecepcionesController,
  obtenerDetalleRecepcionController
} from './recepciones.controller.js';
import { crearRecepcionSchema } from './recepciones.schemas.js';

const router = Router();

router.use(autenticarJwt);

router.get('/', rolesMiddleware('gerente', 'operario'), manejarAsync(listarRecepcionesController));
router.get('/:id/detalle', rolesMiddleware('gerente', 'operario'), manejarAsync(obtenerDetalleRecepcionController));
router.post('/', rolesMiddleware('operario'), validarSolicitud(crearRecepcionSchema), manejarAsync(crearRecepcionController));

export default router;
