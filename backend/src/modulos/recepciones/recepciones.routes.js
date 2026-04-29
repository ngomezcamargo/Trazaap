import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  crearRecepcionController,
  listarRecepcionesController
} from './recepciones.controller.js';
import { crearRecepcionSchema } from './recepciones.schemas.js';

const router = Router();

router.use(autenticarJwt);

router.get('/', manejarAsync(listarRecepcionesController));
router.post('/', validarSolicitud(crearRecepcionSchema), manejarAsync(crearRecepcionController));

export default router;
