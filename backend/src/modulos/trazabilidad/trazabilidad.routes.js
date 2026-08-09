import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import {
  consultarTrazabilidadController,
  registrarCorreccionTrazabilidadController
} from './trazabilidad.controller.js';

const router = Router();

router.use(autenticarJwt);
router.get('/lote/:lote', rolesMiddleware('gerente', 'operario'), manejarAsync(consultarTrazabilidadController));
router.post(
  '/evento/:tipoEvento/:idEntidad/correcciones',
  rolesMiddleware('gerente'),
  manejarAsync(registrarCorreccionTrazabilidadController)
);

export default router;
