import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import { actualizarUsuarioController, consultarUsuarioController, crearUsuarioController, listarUsuariosController } from './usuarios.controller.js';
import { actualizarUsuarioSchema, crearUsuarioSchema } from './usuarios.schemas.js';

const router = Router();
router.use(autenticarJwt, rolesMiddleware('gerente'));
router.get('/', manejarAsync(listarUsuariosController));
router.get('/:id', manejarAsync(consultarUsuarioController));
router.post('/', validarSolicitud(crearUsuarioSchema), manejarAsync(crearUsuarioController));
router.put('/:id', validarSolicitud(actualizarUsuarioSchema), manejarAsync(actualizarUsuarioController));

export default router;
