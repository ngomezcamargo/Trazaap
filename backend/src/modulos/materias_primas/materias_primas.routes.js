import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  actualizarMateriaPrimaController,
  crearMateriaPrimaController,
  listarMateriasPrimasController
} from './materias_primas.controller.js';
import { materiaPrimaSchema } from './materias_primas.schemas.js';

const router = Router();

router.use(autenticarJwt);

router.get('/', rolesMiddleware('gerente', 'operario'), manejarAsync(listarMateriasPrimasController));
router.post('/', rolesMiddleware('administrador'), validarSolicitud(materiaPrimaSchema), manejarAsync(crearMateriaPrimaController));
router.put('/:id', rolesMiddleware('administrador'), validarSolicitud(materiaPrimaSchema), manejarAsync(actualizarMateriaPrimaController));

export default router;
