import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import { configuracionOAuthController, iniciarSesionController, intercambioOAuthController, listarOperariosController, logoutOAuthController, perfilController, renovarOAuthController } from './autenticacion.controller.js';
import { iniciarSesionSchema } from './autenticacion.schemas.js';
import { intercambioOAuthSchema } from './oauth-flow.schemas.js';

const router = Router();

router.post('/login', validarSolicitud(iniciarSesionSchema), manejarAsync(iniciarSesionController));
router.get('/oauth/config', configuracionOAuthController);
router.post('/oauth/exchange', validarSolicitud(intercambioOAuthSchema), manejarAsync(intercambioOAuthController));
router.post('/oauth/refresh', manejarAsync(renovarOAuthController));
router.post('/oauth/logout', manejarAsync(logoutOAuthController));
router.get('/me', autenticarJwt, rolesMiddleware('gerente', 'operario'), manejarAsync(perfilController));
router.get('/operarios', autenticarJwt, rolesMiddleware('gerente', 'operario'), manejarAsync(listarOperariosController));

export default router;
