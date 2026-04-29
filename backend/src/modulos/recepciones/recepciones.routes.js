import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  crearInspeccionController,
  crearRecepcionController,
  listarMateriasPrimasController,
  listarRecepcionesController
} from './recepciones.controller.js';
import { crearInspeccionSchema, crearRecepcionSchema } from './recepciones.schemas.js';

const router = Router();

router.use(autenticarJwt);

router.get('/', manejarAsync(listarRecepcionesController));
router.get('/materias-primas', manejarAsync(listarMateriasPrimasController));
router.post('/', validarSolicitud(crearRecepcionSchema), manejarAsync(crearRecepcionController));
router.post(
  '/:id/inspection',
  validarSolicitud(crearInspeccionSchema),
  manejarAsync(crearInspeccionController)
);

export default router;
