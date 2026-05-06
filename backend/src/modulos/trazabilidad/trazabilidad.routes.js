import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  consultarEventoFabricController,
  consultarTrazabilidadController,
  crearEventoTrazabilidadController,
  listarEventosLoteController,
  verificarLoteController
} from './trazabilidad.controller.js';
import { crearEventoTrazabilidadSchema } from './trazabilidad.schemas.js';

const router = Router();

router.use(autenticarJwt);
router.post('/events', validarSolicitud(crearEventoTrazabilidadSchema), manejarAsync(crearEventoTrazabilidadController));
router.get('/events/:eventId/fabric', manejarAsync(consultarEventoFabricController));
router.get('/lots/:codigoLote/events', manejarAsync(listarEventosLoteController));
router.get('/lots/:codigoLote/verify', manejarAsync(verificarLoteController));
router.get('/lote/:lote', manejarAsync(consultarTrazabilidadController));

export default router;
