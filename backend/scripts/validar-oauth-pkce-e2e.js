import { createHash, randomBytes } from 'node:crypto';

const issuer = process.env.OAUTH_ISSUER;
const api = process.env.RNF11_API_URL || 'http://127.0.0.1:44044/api';
const clientId = process.env.OAUTH_CLIENT_ID;
const redirectUri = process.env.OAUTH_REDIRECT_URI;
const username = process.env.RNF11_OAUTH_USERNAME;
const password = process.env.RNF11_OAUTH_PASSWORD;
const scope = process.env.RNF11_OAUTH_SCOPE || 'openid profile trazaap.read';
if (![issuer, clientId, redirectUri, username, password].every(Boolean)) throw new Error('Faltan variables RNF11/OAuth requeridas');

const discovery = await fetch(`${issuer}/.well-known/openid-configuration`).then((r) => r.json());
const verifier = randomBytes(48).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(24).toString('base64url');
const cookies = new Map();
const cookieHeader = () => [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
function guardarCookies(headers) {
  const individuales = headers.getSetCookie?.() || (headers.get('set-cookie') || '').split(/,(?=\s*[^;,=]+=[^;,]*)/).filter(Boolean);
  for (const item of individuales) {
    const [par] = item.split(';'); const corte = par.indexOf('=');
    cookies.set(par.slice(0, corte), par.slice(corte + 1));
  }
}
function desescaparHtml(valor) { return valor.replaceAll('&amp;', '&').replaceAll('&#x3D;', '='); }

const autorizacion = new URL(discovery.authorization_endpoint);
for (const [k, v] of Object.entries({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope, state, code_challenge: challenge, code_challenge_method: 'S256' })) autorizacion.searchParams.set(k, v);
let respuesta = await fetch(autorizacion, { redirect: 'manual' });
guardarCookies(respuesta.headers);
for (let i = 0; i < 5 && respuesta.status >= 300 && respuesta.status < 400; i += 1) {
  const ubicacion = respuesta.headers.get('location');
  if (!ubicacion) break;
  const siguiente = new URL(ubicacion, autorizacion);
  if (siguiente.href.startsWith(redirectUri)) break;
  respuesta = await fetch(siguiente, { redirect: 'manual', headers: { Cookie: cookieHeader() } });
  guardarCookies(respuesta.headers);
}
const redireccionDirecta = respuesta.headers.get('location');
if (redireccionDirecta?.startsWith(redirectUri)) throw new Error(`Authorization Server rechazo solicitud: ${new URL(redireccionDirecta).searchParams.get('error') || 'sin codigo'}`);
const html = await respuesta.text();
const action = html.match(/<form[^>]+(?:id="kc-form-login"[^>]+action|action)="([^"]+)"/i)?.[1];
if (!action) throw new Error('Keycloak no entrego formulario de autenticacion');
respuesta = await fetch(desescaparHtml(action), {
  method: 'POST', redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieHeader() },
  body: new URLSearchParams({ username, password, credentialId: '', login: 'Sign In' })
});
guardarCookies(respuesta.headers);
let callback;
for (let i = 0; i < 5 && respuesta.status >= 300 && respuesta.status < 400; i += 1) {
  const siguiente = new URL(respuesta.headers.get('location'), autorizacion);
  if (siguiente.href.startsWith(redirectUri)) { callback = siguiente; break; }
  respuesta = await fetch(siguiente, { redirect: 'manual', headers: { Cookie: cookieHeader() } });
  guardarCookies(respuesta.headers);
}
if (!callback) {
  const pagina = await respuesta.text();
  const detalle = pagina.match(/<span[^>]*id="input-error"[^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
  const alerta = pagina.match(/class="[^\"]*pf-v5-c-alert__title[^\"]*"[^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, '').trim();
  const errorTexto = pagina.match(/(Invalid username or password|Account is disabled|Invalid credentials)/i)?.[1];
  const titulo = pagina.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  throw new Error(`Keycloak no completo autenticacion: HTTP ${respuesta.status}${detalle || alerta || errorTexto ? ` (${detalle || alerta || errorTexto})` : ''}${titulo ? ` [${titulo}]` : ''}; cookies=${[...cookies.keys()].join(',')}`);
}
if (callback.searchParams.get('state') !== state || !callback.searchParams.get('code')) {
  throw new Error(`Callback OAuth invalido: ${callback.searchParams.get('error') || 'sin codigo'} ${callback.searchParams.get('error_description') || ''}`.trim());
}

const intercambio = await fetch(`${api}/auth/oauth/exchange`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: callback.searchParams.get('code'), code_verifier: verifier })
});
const cookiesIntercambio = intercambio.headers.getSetCookie?.() || [intercambio.headers.get('set-cookie') || ''];
const refreshCookie = cookiesIntercambio.find((item) => item.startsWith('trazaap_oauth_refresh='))?.split(';')[0];
const tokens = await intercambio.json();
if (!intercambio.ok || !tokens.access_token || !refreshCookie) throw new Error(`Intercambio backend rechazado: HTTP ${intercambio.status}`);
const claims = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString('utf8'));
const demora = Number(process.env.RNF11_DELAY_BEFORE_PROFILE_MS || 0);
if (demora > 0) await new Promise((resolve) => setTimeout(resolve, demora));
const perfil = await fetch(`${api}/auth/me`, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
const identidad = await perfil.json();
const esperadoPerfil = Number(process.env.RNF11_EXPECT_PROFILE_STATUS || 200);
if (perfil.status !== esperadoPerfil || (esperadoPerfil === 200 && identidad.email !== `${username}@invalid.local`)) throw new Error(`Mapeo de identidad inesperado: HTTP ${perfil.status}, esperado ${esperadoPerfil} (${identidad.error || identidad.message || 'sin detalle'}; iss=${claims.iss}; sub=${claims.sub}; aud=${JSON.stringify(claims.aud)}; vida=${claims.exp - claims.iat}s)`);
if (esperadoPerfil !== 200) {
  await fetch(`${api}/auth/oauth/logout`, { method: 'POST', headers: { Cookie: refreshCookie } });
  console.log(JSON.stringify({ flujo: 'authorization_code_pkce_s256', usuario: username, perfil: perfil.status, issuer: claims.iss, audience: claims.aud || null, vidaSegundos: claims.exp - claims.iat }));
  process.exit(0);
}
const esperadoUsuarios = Number(process.env.RNF11_EXPECT_USERS_STATUS || 200);
const usuarios = await fetch(`${api}/usuarios`, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
if (usuarios.status !== esperadoUsuarios) throw new Error(`RBAC inesperado en usuarios: ${usuarios.status}, esperado ${esperadoUsuarios}`);
const sinToken = await fetch(`${api}/usuarios`);
if (sinToken.status !== 401) throw new Error(`Endpoint protegido sin token respondio ${sinToken.status}`);
const partes = tokens.access_token.split('.'); partes[2] = 'AAAA';
const alterado = await fetch(`${api}/usuarios`, { headers: { Authorization: `Bearer ${partes.join('.')}` } });
if (alterado.status !== 401) throw new Error(`Token alterado respondio ${alterado.status}`);

const esperadoEpcis = Number(process.env.RNF11_EXPECT_EPCIS_STATUS || 202);
const documentoEpcis = {
  '@context': ['https://ref.gs1.org/standards/epcis/epcis-context.jsonld'], type: 'EPCISDocument', schemaVersion: '2.0', creationDate: new Date().toISOString(),
  epcisBody: { eventList: [{ type: 'ObjectEvent', eventTime: new Date().toISOString(), eventTimeZoneOffset: '-05:00', action: 'OBSERVE', bizStep: 'shipping', quantityList: [{ epcClass: 'urn:epc:class:lgtin:0614141.112345.PRUEBA-RNF11' }] }] }
};
const capture = await fetch(`${api}/epcis/capture`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/vnd.gs1.epcis+json' }, body: JSON.stringify(documentoEpcis) });
if (capture.status !== esperadoEpcis) throw new Error(`EPCIS Capture respondio ${capture.status}, esperado ${esperadoEpcis}: ${await capture.text()}`);
const query = await fetch(`${api}/epcis/events?lote=LOTE-FICTICIO-RNF11`, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
const esperadoQuery = esperadoEpcis === 202 ? 200 : esperadoEpcis;
if (query.status !== esperadoQuery) throw new Error(`EPCIS Query respondio ${query.status}, esperado ${esperadoQuery}`);
let epcisInvalido = null; let contentTypeInvalido = null; let payloadExcesivo = null;
if (esperadoEpcis === 202) {
  if (!query.headers.get('content-type')?.startsWith('application/vnd.gs1.epcis+json')) throw new Error('EPCIS Query no devolvio media type GS1');
  epcisInvalido = await fetch(`${api}/epcis/capture`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'EPCISDocument' }) });
  if (epcisInvalido.status !== 400) throw new Error(`Documento EPCIS invalido respondio ${epcisInvalido.status}`);
  contentTypeInvalido = await fetch(`${api}/epcis/capture`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'text/plain' }, body: '{}' });
  if (contentTypeInvalido.status !== 415) throw new Error(`Content-Type EPCIS invalido respondio ${contentTypeInvalido.status}`);
  payloadExcesivo = await fetch(`${api}/epcis/capture`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ relleno: 'x'.repeat(1024 * 1024 + 1) }) });
  if (payloadExcesivo.status !== 413) throw new Error(`Payload EPCIS excesivo respondio ${payloadExcesivo.status}`);
}
const renovacion = await fetch(`${api}/auth/oauth/refresh`, { method: 'POST', headers: { Cookie: refreshCookie } });
const tokensRenovados = await renovacion.json();
if (!renovacion.ok || !tokensRenovados.access_token) throw new Error(`Refresh rechazado: HTTP ${renovacion.status}`);
const logout = await fetch(`${api}/auth/oauth/logout`, { method: 'POST', headers: { Cookie: refreshCookie } });
if (!logout.ok) throw new Error(`Logout rechazado: HTTP ${logout.status}`);
const reuso = await fetch(`${api}/auth/oauth/refresh`, { method: 'POST', headers: { Cookie: refreshCookie } });
if (reuso.status !== 401) throw new Error(`Refresh revocado fue aceptado: HTTP ${reuso.status}`);
console.log(JSON.stringify({ flujo: 'authorization_code_pkce_s256', usuario: username, rol: identidad.role, intercambio: intercambio.status, perfil: perfil.status, usuarios: usuarios.status, sinToken: sinToken.status, tokenAlterado: alterado.status, epcisCapture: capture.status, epcisQuery: query.status, epcisInvalido: epcisInvalido?.status, contentTypeInvalido: contentTypeInvalido?.status, payloadExcesivo: payloadExcesivo?.status, refresh: renovacion.status, logout: logout.status, reusoRefresh: reuso.status }));
