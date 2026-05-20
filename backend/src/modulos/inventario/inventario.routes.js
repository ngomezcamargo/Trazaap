import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import {
  listarInventarioInsumosController,
  listarMovimientosInventarioController,
  listarInventarioProductoTerminadoController
} from './inventario.controller.js';

const router = Router();

router.use(autenticarJwt);
router.get('/terminados', rolesMiddleware('administrador', 'gerente'), manejarAsync(listarInventarioProductoTerminadoController));
router.get('/movimientos', rolesMiddleware('administrador', 'gerente'), manejarAsync(listarMovimientosInventarioController));
router.get('/', rolesMiddleware('administrador', 'gerente'), manejarAsync(listarInventarioInsumosController));

export default router;
