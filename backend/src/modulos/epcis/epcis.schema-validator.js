import fs from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { entorno } from '../../configuracion/entorno.js';
import { ErrorHttp } from '../../middlewares/errorHttp.js';

let validar;

function cargarValidador() {
  if (validar) return validar;
  if (!entorno.epcis.schemaPath) {
    throw new ErrorHttp(503, 'Esquema oficial EPCIS no configurado');
  }

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(entorno.epcis.schemaPath, 'utf8'));
  } catch {
    throw new ErrorHttp(503, 'Esquema oficial EPCIS no disponible');
  }

  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: true });
  addFormats(ajv);
  validar = ajv.compile(schema);
  return validar;
}

export function validarContraSchemaOficialEpcis(documento) {
  const comprobar = cargarValidador();
  if (comprobar(documento)) return documento;
  const errores = (comprobar.errors || []).slice(0, 10).map(({ instancePath, keyword, message }) => ({
    ruta: instancePath || '/', keyword, mensaje: message
  }));
  throw new ErrorHttp(400, 'Documento no conforme con GS1 EPCIS 2.0', { codigo: 'EPCIS_SCHEMA_INVALIDO', errores });
}

export function reiniciarValidadorEpcisParaPruebas() { validar = undefined; }
