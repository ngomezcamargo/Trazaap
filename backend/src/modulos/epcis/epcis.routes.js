import { Router } from 'express';
import { z } from 'zod';
import { autenticarJwt } from '../../middlewares/autenticarJwt.js';
import { manejarAsync } from '../../middlewares/manejarAsync.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';
import { requerirOAuth, requerirScopes } from '../../middlewares/oauthScopes.middleware.js';
import { rolesMiddleware } from '../../middlewares/roles.middleware.js';
import { validarSolicitud } from '../../middlewares/validarSolicitud.js';
import { capturar, consultar } from './epcis.controller.js';
const router=Router();
const tiposEpcis=['application/json','application/ld+json','application/vnd.gs1.epcis+json'];
function requerirJsonEpcis(req,res,next){return req.is(tiposEpcis)?next():next(new ErrorHttp(415,'Content-Type EPCIS no soportado'));}
router.use(autenticarJwt,requerirOAuth);
router.get('/events',requerirScopes('epcis.query'),rolesMiddleware('gerente'),validarSolicitud(z.object({lote:z.string().trim().min(1).max(100)}).strict(),'query'),manejarAsync(consultar));
router.post('/capture',requerirScopes('epcis.capture'),rolesMiddleware('gerente'),requerirJsonEpcis,manejarAsync(capturar));
export default router;
