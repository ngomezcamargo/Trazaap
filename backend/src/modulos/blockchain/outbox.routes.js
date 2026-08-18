import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import {
  listarOutboxController,
  reintentarOutboxController,
  resumirOutboxController
} from './outbox.controller.js';

const router = Router();
router.use(autenticarJwt, rolesMiddleware('administrador', 'gerente'));
router.get('/', manejarAsync(listarOutboxController));
router.get('/resumen', manejarAsync(resumirOutboxController));
router.post('/:id/reintentar', manejarAsync(reintentarOutboxController));

export default router;
