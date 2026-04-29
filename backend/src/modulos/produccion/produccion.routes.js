import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  asociarMateriasController,
  crearOrdenProduccionController,
  listarOrdenesProduccionController,
  listarRecepcionesAceptadasController,
  registrarMojesController,
  registrarTiemposController
} from './produccion.controller.js';
import {
  asociarMateriasSchema,
  crearOrdenProduccionSchema,
  registrarMojesSchema,
  registrarTiemposSchema
} from './produccion.schemas.js';

const router = Router();
router.use(autenticarJwt);

router.get('/ordenes', manejarAsync(listarOrdenesProduccionController));
router.get('/recepciones-disponibles', manejarAsync(listarRecepcionesAceptadasController));
router.post('/ordenes', validarSolicitud(crearOrdenProduccionSchema), manejarAsync(crearOrdenProduccionController));
router.post('/ordenes/:id/materias', validarSolicitud(asociarMateriasSchema), manejarAsync(asociarMateriasController));
router.post('/ordenes/:id/mojes', validarSolicitud(registrarMojesSchema), manejarAsync(registrarMojesController));
router.post('/ordenes/:id/tiempos', validarSolicitud(registrarTiemposSchema), manejarAsync(registrarTiemposController));

export default router;
