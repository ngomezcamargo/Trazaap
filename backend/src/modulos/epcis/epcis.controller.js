import { capturarDocumentoEpcis, consultarEpcisPorLote } from './epcis.service.js';
const MEDIA_TYPE = 'application/vnd.gs1.epcis+json';
export async function consultar(req,res){const documento=await consultarEpcisPorLote(req.query.lote,req.usuario.email);res.type(MEDIA_TYPE).json(documento);}
export async function capturar(req,res){const resultado=await capturarDocumentoEpcis(req.body,req.usuario.email);res.status(202).type(MEDIA_TYPE).json(resultado);}
