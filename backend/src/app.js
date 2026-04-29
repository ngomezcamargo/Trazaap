import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { entorno } from './configuracion/entorno.js';
import { manejoErrores } from './middlewares/manejoErrores.js';
import { noEncontrado } from './middlewares/noEncontrado.js';
import rutasAutenticacion from './modulos/autenticacion/autenticacion.routes.js';
import rutasProveedores from './modulos/proveedores/proveedores.routes.js';
import rutasRecepciones from './modulos/recepciones/recepciones.routes.js';
import rutasTrazabilidad from './modulos/trazabilidad/trazabilidad.routes.js';
import rutasProduccion from './modulos/produccion/produccion.routes.js';
import rutasLiberacion from './modulos/liberacion/liberacion.routes.js';

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
  api.use('/produccion', rutasProduccion);
  api.use('/liberacion', rutasLiberacion);
  api.use('/traceability', rutasTrazabilidad);

  app.use(entorno.apiPrefix, api);

  app.use(noEncontrado);
  app.use(manejoErrores);

  return app;
}
