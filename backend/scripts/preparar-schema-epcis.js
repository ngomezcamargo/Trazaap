import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const URL_OFICIAL = 'https://ref.gs1.org/standards/epcis/epcis-json-schema.json';
const SHA256_201 = '0f46ff694efffd8d8ce840a33dfde84228add11b516b8b258f3200740ae210af';
const destino = process.argv[2];

if (!destino) throw new Error('Uso: npm run epcis:schema:prepare -- /ruta/epcis-json-schema.json');
const respuesta = await fetch(URL_OFICIAL);
if (!respuesta.ok) throw new Error(`No fue posible descargar el esquema oficial: HTTP ${respuesta.status}`);
const contenido = Buffer.from(await respuesta.arrayBuffer());
const hash = createHash('sha256').update(contenido).digest('hex');
if (hash !== SHA256_201) throw new Error('El esquema GS1 descargado no coincide con EPCIS 2.0.1 validado');
const schema = JSON.parse(contenido.toString('utf8'));
if (schema.$id !== 'https://ref.gs1.org/standards/epcis/2.0.1/epcis-json-schema.json') throw new Error('Version EPCIS inesperada');
await writeFile(destino, contenido, { flag: 'wx', mode: 0o644 });
console.log(`Esquema GS1 EPCIS 2.0.1 preparado en ${destino}`);
