import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
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

// El operario necesita consultar proveedores para poder registrar recepciones.
// Las operaciones de alta, edición y eliminación siguen reservadas al administrador.
router.get('/', rolesMiddleware('gerente', 'operario'), manejarAsync(listarProveedoresController));
router.get('/:id', rolesMiddleware('gerente', 'operario'), manejarAsync(consultarProveedorController));
router.post('/', rolesMiddleware('administrador'), validarSolicitud(proveedorSchema), manejarAsync(crearProveedorController));
router.put('/:id', rolesMiddleware('administrador'), validarSolicitud(proveedorSchema), manejarAsync(actualizarProveedorController));
router.delete('/:id', rolesMiddleware('administrador'), manejarAsync(eliminarProveedorController));

export default router;
