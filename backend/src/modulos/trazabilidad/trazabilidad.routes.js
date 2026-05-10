import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { consultarTrazabilidadController } from './trazabilidad.controller.js';

const router = Router();

router.use(autenticarJwt);
router.get('/lote/:lote', manejarAsync(consultarTrazabilidadController));

export default router;
