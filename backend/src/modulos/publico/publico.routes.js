import { Router } from 'express';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { consultarTrazabilidadPublicaController } from './publico.controller.js';

const router = Router();

router.get('/traceability/lote/:lote', manejarAsync(consultarTrazabilidadPublicaController));

export default router;
