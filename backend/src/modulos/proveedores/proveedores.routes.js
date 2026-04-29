import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  actualizarProveedorController,
  consultarProveedorController,
  crearProveedorController,
  eliminarProveedorController,
  listarProveedoresController
} from './proveedores.controller.js';
import { proveedorSchema } from './proveedores.schemas.js';

const router = Router();

router.use(autenticarJwt);

router.get('/', manejarAsync(listarProveedoresController));
router.get('/:id', manejarAsync(consultarProveedorController));
router.post('/', validarSolicitud(proveedorSchema), manejarAsync(crearProveedorController));
router.put('/:id', validarSolicitud(proveedorSchema), manejarAsync(actualizarProveedorController));
router.delete('/:id', manejarAsync(eliminarProveedorController));

export default router;
