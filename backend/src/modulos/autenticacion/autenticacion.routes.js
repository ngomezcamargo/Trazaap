import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import { iniciarSesionController, perfilController } from './autenticacion.controller.js';
import { iniciarSesionSchema } from './autenticacion.schemas.js';

const router = Router();

router.post('/login', validarSolicitud(iniciarSesionSchema), manejarAsync(iniciarSesionController));
router.get('/me', autenticarJwt, manejarAsync(perfilController));

export default router;
