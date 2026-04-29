import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import { crearLiberacionController, listarLiberacionesController } from './liberacion.controller.js';
import { crearLiberacionSchema } from './liberacion.schemas.js';

const router = Router();
router.use(autenticarJwt);

router.get('/', manejarAsync(listarLiberacionesController));
router.post('/', validarSolicitud(crearLiberacionSchema), manejarAsync(crearLiberacionController));

export default router;
