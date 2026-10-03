import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import { iniciarSesionController, listarOperariosController, perfilController } from './autenticacion.controller.js';
import { iniciarSesionSchema } from './autenticacion.schemas.js';

const router = Router();

router.post('/login', validarSolicitud(iniciarSesionSchema), manejarAsync(iniciarSesionController));
router.get('/me', autenticarJwt, rolesMiddleware('gerente', 'operario'), manejarAsync(perfilController));
router.get('/operarios', autenticarJwt, rolesMiddleware('gerente', 'operario'), manejarAsync(listarOperariosController));

export default router;
