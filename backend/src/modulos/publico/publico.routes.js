import { Router } from 'express';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import { confirmarEntregaSchema } from '../despachos/despachos.schemas.js';
import {
  confirmarRecepcionClienteController,
  consultarTrazabilidadAuditoriaController,
  consultarTrazabilidadClienteController,
  consultarTrazabilidadPublicaController
} from './publico.controller.js';

const router = Router();

router.get('/traceability/lote/:lote', manejarAsync(consultarTrazabilidadPublicaController));
router.get('/traceability/cliente', manejarAsync(consultarTrazabilidadClienteController));
router.post('/traceability/cliente/confirmar', validarSolicitud(confirmarEntregaSchema), manejarAsync(confirmarRecepcionClienteController));
router.get('/traceability/auditoria', manejarAsync(consultarTrazabilidadAuditoriaController));

export default router;
