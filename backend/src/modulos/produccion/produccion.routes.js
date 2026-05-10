import { Router } from 'express';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
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

router.get('/ordenes', manejarAsync(listarOrdenesProduccionController));
router.get('/manufactura/ordenes', manejarAsync(listarOrdenesManufacturaController));
router.get('/ordenes/:id', manejarAsync(obtenerDetalleOrdenController));
router.get('/ordenes/:id/productos/:productoId/manufactura', manejarAsync(obtenerContextoManufacturaController));
router.get('/productos', manejarAsync(listarProductosFabricadosController));
router.get('/productos/:productoId', manejarAsync(obtenerDetalleProductoFabricadoController));
router.get('/recepciones-disponibles', manejarAsync(listarRecepcionesAceptadasController));
router.post('/ordenes', validarSolicitud(crearOrdenProduccionSchema), manejarAsync(crearOrdenProduccionController));
router.post('/productos', validarSolicitud(productoFabricadoSchema), manejarAsync(crearProductoFabricadoController));
router.put('/productos/:productoId', validarSolicitud(productoFabricadoSchema), manejarAsync(actualizarProductoFabricadoController));
router.post('/calcular-insumos', validarSolicitud(calcularInsumosSchema), manejarAsync(calcularInsumosRequeridosController));
router.put('/ordenes/:id/estado', validarSolicitud(actualizarEstadoOrdenSchema), manejarAsync(actualizarEstadoOrdenController));
router.post('/ordenes/:id/materias', validarSolicitud(asociarMateriasSchema), manejarAsync(asociarMateriasController));
router.put('/ordenes/:id/materias/:materiaId', validarSolicitud(actualizarCantidadRealMateriaSchema), manejarAsync(actualizarCantidadRealMateriaController));
router.post('/ordenes/:id/tiempos', validarSolicitud(registrarTiemposSchema), manejarAsync(registrarTiemposController));
router.post('/ordenes/:id/productos/:productoId/manufactura', validarSolicitud(registroManufacturaSchema), manejarAsync(registrarManufacturaController));

export default router;
