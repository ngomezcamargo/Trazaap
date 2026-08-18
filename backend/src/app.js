import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { entorno } from './configuracion/entorno.js';
import { erroresMiddleware, noEncontradoMiddleware } from './middlewares/errores.middleware.js';
import rutasAutenticacion from './modulos/autenticacion/autenticacion.routes.js';
import rutasProveedores from './modulos/proveedores/proveedores.routes.js';
import rutasRecepciones from './modulos/recepciones/recepciones.routes.js';
import rutasMateriasPrimas from './modulos/materias_primas/materias_primas.routes.js';
import rutasTrazabilidad from './modulos/trazabilidad/trazabilidad.routes.js';
import rutasProduccion from './modulos/produccion/produccion.routes.js';
import rutasLiberacion from './modulos/liberacion/liberacion.routes.js';
import rutasInventario from './modulos/inventario/inventario.routes.js';
import rutasPublicas from './modulos/publico/publico.routes.js';
import rutasAlmacenamiento from './modulos/almacenamiento/almacenamiento.routes.js';
import rutasBlockchain from './modulos/blockchain/outbox.routes.js';
import rutasClientes from './modulos/clientes/clientes.routes.js';
import rutasDespachos from './modulos/despachos/despachos.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  const api = express.Router();

  api.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'trazaap-api' });
  });

  api.use('/auth', rutasAutenticacion);
  api.use('/providers', rutasProveedores);
  api.use('/receptions', rutasRecepciones);
  api.use('/materias-primas', rutasMateriasPrimas);
  api.use('/produccion', rutasProduccion);
  api.use('/liberacion', rutasLiberacion);
  api.use('/almacenamiento', rutasAlmacenamiento);
  api.use('/blockchain', rutasBlockchain);
  api.use('/clientes', rutasClientes);
  api.use('/despachos', rutasDespachos);
  api.use('/inventario-insumos', rutasInventario);
  api.use('/traceability', rutasTrazabilidad);
  api.use('/public', rutasPublicas);

  app.use(entorno.apiPrefix, api);

  app.use(noEncontradoMiddleware);
  app.use(erroresMiddleware);

  return app;
}
