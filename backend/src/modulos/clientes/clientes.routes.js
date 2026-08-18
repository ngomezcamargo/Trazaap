import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  actualizarClienteController,
  consultarClienteController,
  crearClienteController,
  listarClientesController
} from './clientes.controller.js';
import { clienteSchema } from './clientes.schemas.js';

const router = Router();
router.use(autenticarJwt);

router.get('/', rolesMiddleware('gerente', 'operario'), manejarAsync(listarClientesController));
router.get('/:id', rolesMiddleware('gerente', 'operario'), manejarAsync(consultarClienteController));
router.post('/', rolesMiddleware('administrador'), validarSolicitud(clienteSchema), manejarAsync(crearClienteController));
router.put('/:id', rolesMiddleware('administrador'), validarSolicitud(clienteSchema), manejarAsync(actualizarClienteController));

export default router;
