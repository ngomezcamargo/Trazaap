import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import {
  calcularInsumosRequeridosController,
  crearProductoFabricadoController,
  actualizarCantidadRealMateriaController,
  actualizarEstadoOrdenController,
  actualizarProductoFabricadoController,
  asociarMateriasController,
  crearOrdenProduccionController,
  listarProductosFabricadosController,
  listarOrdenesManufacturaController,
  listarOrdenesProduccionController,
  listarRecepcionesAceptadasController,
  obtenerContextoManufacturaController,
  obtenerDetalleProductoFabricadoController,
  obtenerDetalleOrdenController,
  registrarManufacturaController,
  registrarTiemposController
} from './produccion.controller.js';
import {
  calcularInsumosSchema,
  productoFabricadoSchema,
  actualizarCantidadRealMateriaSchema,
  actualizarEstadoOrdenSchema,
  asociarMateriasSchema,
  crearOrdenProduccionSchema,
  registroManufacturaSchema,
  registrarTiemposSchema
} from './produccion.schemas.js';

const router = Router();
router.use(autenticarJwt);

router.get('/ordenes', rolesMiddleware('gerente', 'operario'), manejarAsync(listarOrdenesProduccionController));
router.get('/manufactura/ordenes', rolesMiddleware('operario'), manejarAsync(listarOrdenesManufacturaController));
router.get('/ordenes/:id', rolesMiddleware('gerente', 'operario'), manejarAsync(obtenerDetalleOrdenController));
router.get('/ordenes/:id/productos/:productoId/manufactura', rolesMiddleware('operario'), manejarAsync(obtenerContextoManufacturaController));
router.get('/productos', rolesMiddleware('gerente', 'operario'), manejarAsync(listarProductosFabricadosController));
router.get('/productos/:productoId', rolesMiddleware('gerente', 'operario'), manejarAsync(obtenerDetalleProductoFabricadoController));
router.get('/recepciones-disponibles', rolesMiddleware('administrador'), manejarAsync(listarRecepcionesAceptadasController));
router.post('/ordenes', rolesMiddleware('administrador'), validarSolicitud(crearOrdenProduccionSchema), manejarAsync(crearOrdenProduccionController));
router.post('/productos', rolesMiddleware('administrador', 'gerente'), validarSolicitud(productoFabricadoSchema), manejarAsync(crearProductoFabricadoController));
router.put('/productos/:productoId', rolesMiddleware('administrador', 'gerente'), validarSolicitud(productoFabricadoSchema), manejarAsync(actualizarProductoFabricadoController));
router.post('/calcular-insumos', rolesMiddleware('administrador'), validarSolicitud(calcularInsumosSchema), manejarAsync(calcularInsumosRequeridosController));
router.put('/ordenes/:id/estado', rolesMiddleware('administrador'), validarSolicitud(actualizarEstadoOrdenSchema), manejarAsync(actualizarEstadoOrdenController));
router.post('/ordenes/:id/materias', rolesMiddleware('administrador'), validarSolicitud(asociarMateriasSchema), manejarAsync(asociarMateriasController));
router.put('/ordenes/:id/materias/:materiaId', rolesMiddleware('administrador'), validarSolicitud(actualizarCantidadRealMateriaSchema), manejarAsync(actualizarCantidadRealMateriaController));
router.post('/ordenes/:id/tiempos', rolesMiddleware('operario'), validarSolicitud(registrarTiemposSchema), manejarAsync(registrarTiemposController));
router.post('/ordenes/:id/productos/:productoId/manufactura', rolesMiddleware('operario'), validarSolicitud(registroManufacturaSchema), manejarAsync(registrarManufacturaController));

export default router;
