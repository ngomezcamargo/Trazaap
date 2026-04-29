import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  actualizarMateriaPrimaController,
  crearMateriaPrimaController,
  listarMateriasPrimasController
} from './materias_primas.controller.js';
import { materiaPrimaSchema } from './materias_primas.schemas.js';

const router = Router();

router.use(autenticarJwt);

router.get('/', manejarAsync(listarMateriasPrimasController));
router.post('/', validarSolicitud(materiaPrimaSchema), manejarAsync(crearMateriaPrimaController));
router.put('/:id', validarSolicitud(materiaPrimaSchema), manejarAsync(actualizarMateriaPrimaController));

export default router;
