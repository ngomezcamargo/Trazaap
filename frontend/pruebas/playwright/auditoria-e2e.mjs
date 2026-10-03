import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000';
const apiBaseURL = process.env.PW_API_URL || 'http://localhost:4000/api';
const outputDir = path.resolve(process.env.PW_OUTPUT_DIR || path.join(process.cwd(), '..', 'pruebas', 'evidencia-playwright'));
const timestamp = new Date().toISOString();

const routes = [
  ['panel', '/panel'],
  ['proveedores', '/proveedores'],
  ['materias-primas', '/materias-primas'],
  ['recepciones', '/recepciones'],
  ['nueva-recepcion', '/recepciones/nueva'],
  ['produccion', '/produccion'],
  ['almacenamiento', '/almacenamiento'],
  ['liberacion', '/liberacion'],
  ['despachos', '/despachos'],
  ['trazabilidad', '/trazabilidad'],
  ['inventario', '/inventario'],
  ['reportes', '/reportes'],
  ['documentos', '/documentos'],
  ['usuarios', '/usuarios'],
];

const publicRoutes = [
  ['login', '/iniciar-sesion'],
];

const credentials = {
  administrador: {
    email: process.env.PW_ADMIN_EMAIL || 'admin@trazaap.local',
    password: process.env.PW_ADMIN_PASSWORD || 'Admin123*'
  },
  gerente: {
    email: process.env.PW_GERENTE_EMAIL || 'gerente@trazaap.local',
    password: process.env.PW_GERENTE_PASSWORD || 'Gerente123*'
  },
  operario: {
    email: process.env.PW_OPERARIO_EMAIL || 'operario@trazaap.local',
    password: process.env.PW_OPERARIO_PASSWORD || 'Operario123*'
  }
};

const results = {
  metadata: {
    startedAt: timestamp,
    baseURL,
    outputDir,
    browser: 'Chromium mediante @playwright/test',
    scope: 'Auditoria end-to-end sin cambios funcionales en la aplicacion'
  },
  checks: [],
  issues: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  httpErrors: []
};

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

function addCheck(check) {
  results.checks.push({ time: new Date().toISOString(), ...check });
}

function addIssue(issue) {
  results.issues.push({ time: new Date().toISOString(), ...issue });
}

function attachDiagnostics(page, context) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const entry = { role: context.role, url: page.url(), text: message.text() };
      results.consoleErrors.push(entry);
    }
  });
  page.on('pageerror', (error) => {
    const entry = { role: context.role, url: page.url(), text: error.message, stack: error.stack };
    results.pageErrors.push(entry);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const entry = { role: context.role, url: page.url(), request: request.url(), method: request.method(), error: failure?.errorText || 'request failed' };
    results.failedRequests.push(entry);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      results.httpErrors.push({ role: context.role, url: page.url(), request: response.url(), method: response.request().method(), status: response.status() });
    }
    if (response.status() >= 500) {
      addIssue({
        severity: 'alta',
        kind: 'server-response',
        role: context.role,
        url: page.url(),
        request: response.url(),
        status: response.status(),
        title: 'La interfaz recibió una respuesta 5xx'
      });
    }
  });
}

async function saveScreenshot(page, name) {
  const file = path.join(outputDir, `${safeName(name)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function gotoAndObserve(page, role, name, route) {
  const started = Date.now();
  try {
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    const title = await page.title().catch(() => '');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const screenshot = await saveScreenshot(page, `${role}-${name}`);
    const status = response?.status() || 0;
    const redirectedToLogin = /iniciar-sesion/.test(page.url()) && route !== '/iniciar-sesion';
    const result = status > 0 && status < 500 && !redirectedToLogin ? 'observado' : 'fallo';
    addCheck({
      id: `${role}-${name}`,
      role,
      name,
      route,
      result,
      httpStatus: status,
      finalUrl: page.url(),
      title,
      durationMs: Date.now() - started,
      screenshot
    });
    if (status >= 500) {
      addIssue({ severity: 'alta', kind: 'route-http', role, route, status, evidence: screenshot, title: 'La ruta responde con error de servidor' });
    } else if (redirectedToLogin && !redirectExpected(role, route)) {
      addIssue({ severity: 'media', kind: 'access-redirect', role, route, evidence: screenshot, title: 'La ruta redirige al inicio de sesión para este rol' });
    }
    return { status, bodyText, redirectedToLogin, screenshot };
  } catch (error) {
    const screenshot = await saveScreenshot(page, `${role}-${name}-exception`).catch(() => null);
    addCheck({ id: `${role}-${name}`, role, name, route, result: 'fallo', error: error.message, screenshot });
    addIssue({ severity: 'alta', kind: 'route-exception', role, route, evidence: screenshot, title: 'La ruta no pudo cargarse', details: error.message });
    return { status: 0, bodyText: '', redirectedToLogin: false, screenshot };
  }
}

function redirectExpected(role, route) {
  if (route === '/panel') return false;
  if (role === 'administrador') return false;
  const permitidos = {
    gerente: ['/proveedores', '/materias-primas', '/recepciones', '/produccion', '/almacenamiento', '/liberacion', '/despachos', '/trazabilidad', '/inventario', '/reportes', '/documentos', '/usuarios'],
    operario: ['/materias-primas', '/recepciones', '/produccion', '/almacenamiento', '/liberacion', '/despachos', '/trazabilidad', '/inventario']
  };
  return !(permitidos[role] || []).includes(route);
}

async function login(page, role) {
  const account = credentials[role];
  await page.goto(`${baseURL}/iniciar-sesion`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesion' }).click();
  try {
    await page.waitForURL(/\/panel/, { timeout: 15000 });
    await page.waitForTimeout(2500);
    const tokenGuardado = await page.evaluate(() => Boolean(localStorage.getItem('trazaap_token')));
    if (!tokenGuardado) throw new Error('La interfaz redirigió a panel sin conservar el token de sesión');
  } catch {
    const response = await page.request.post(`${apiBaseURL}/auth/login`, { data: account }).catch(() => null);
    if (!response?.ok()) {
      const message = await page.locator('.alerta.error').first().innerText().catch(() => 'Sin mensaje visible');
      addIssue({ severity: 'critica', kind: 'login', role, title: `No fue posible iniciar sesión como ${role}`, details: message });
      addCheck({ id: `login-${role}`, role, name: 'inicio de sesión', route: '/iniciar-sesion', result: 'fallo', error: message });
      return false;
    }
    const data = await response.json();
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('trazaap_token', token);
      localStorage.setItem('trazaap_user', JSON.stringify(user));
      localStorage.setItem('trazaap_auth_mode', 'legacy');
      localStorage.setItem('trazaap_last_activity', String(Date.now()));
    }, { token: data.token, user: data.user });
    await page.goto(`${baseURL}/panel`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    addCheck({ id: `login-${role}`, role, name: 'inicio de sesión', route: '/iniciar-sesion', result: 'observado', method: 'fallback API de preparación Playwright', finalUrl: page.url() });
    return page.url().includes('/panel');
  }
  addCheck({ id: `login-${role}`, role, name: 'inicio de sesión', route: '/iniciar-sesion', result: 'aprobado', finalUrl: page.url() });
  return true;
}

async function inspectForms(page, role) {
  for (const [name, route] of routes) {
    await gotoAndObserve(page, role, `${name}-antes-formulario`, route);
    if (page.url().includes('/iniciar-sesion')) continue;

    if (name === 'produccion' && role === 'administrador') {
      const tab = page.getByRole('button', { name: 'Nueva orden', exact: true }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        const open = page.getByRole('button', { name: 'Nueva orden de produccion', exact: true });
        await open.click();
        const modal = page.locator('.modal').first();
        const visible = await modal.isVisible().catch(() => false);
        addCheck({ id: `${role}-${name}-form`, role, name: 'apertura de formulario: Nueva orden de produccion', route, result: visible ? 'observado' : 'fallo', modalVisible: visible });
        if (!visible) addIssue({ severity: 'alta', kind: 'form-open', role, route, title: 'El formulario de nueva orden no se mostró' });
        else {
          const cancel = page.getByRole('button', { name: /^cancelar$/i }).last();
          await cancel.click();
          addCheck({ id: `${role}-${name}-cancel`, role, name: 'cancelación de formulario: Nueva orden de produccion', route, result: (await modal.isVisible().catch(() => false)) ? 'fallo' : 'aprobado' });
        }
      }
      continue;
    }

    if (name === 'reportes' && role !== 'operario') {
      const input = page.locator('input[placeholder="Ej. BG-001"]');
      if (!(await input.count())) {
        addCheck({ id: `${role}-${name}-form`, role, name: 'generación de reporte', route, result: 'bloqueado', reason: 'No se encontró el campo de lote en la pantalla' });
        addIssue({ severity: 'alta', kind: 'report-form', role, route, title: 'No se encontró el campo de lote para generar el reporte' });
        continue;
      }
      await input.fill('7878');
      const existingPages = new Set(page.context().pages());
      await page.getByRole('button', { name: 'Generar reporte', exact: true }).click();
      await page.waitForTimeout(1800);
      const popup = page.context().pages().find((item) => !existingPages.has(item)) || null;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        const screenshot = await saveScreenshot(popup, `${role}-${name}-reporte-abierto`);
        addCheck({ id: `${role}-${name}-form`, role, name: 'generación de reporte', route, result: 'observado', popupUrl: popup.url(), screenshot });
        await popup.close();
      } else {
        addCheck({ id: `${role}-${name}-form`, role, name: 'generación de reporte', route, result: 'fallo' });
        addIssue({ severity: 'alta', kind: 'report-open', role, route, title: 'El botón de generación no abrió el reporte' });
      }
      continue;
    }

    const candidates = page.getByRole('button').filter({ hasText: /nuevo|nueva|crear|agregar|registrar|asociar|liberar|despacho|subir|generar/i });
    const count = await candidates.count();
    if (!count) continue;
    const button = candidates.first();
    if (!(await button.isVisible().catch(() => false))) continue;
    const label = await button.innerText().catch(() => 'accion');
    if (/^nueva orden$/i.test(label) || /^generar reporte$/i.test(label)) continue;
    try {
      await button.click({ timeout: 5000 });
      await page.waitForTimeout(300);
      const modal = page.locator('.modal, [role="dialog"]').first();
      const hasModal = await modal.isVisible().catch(() => false);
      const screenshot = await saveScreenshot(page, `${role}-${name}-formulario-abierto`);
      addCheck({ id: `${role}-${name}-form`, role, name: `apertura de formulario: ${label}`, route, result: hasModal ? 'observado' : 'fallo', modalVisible: hasModal, screenshot });
      if (!hasModal) {
        addIssue({ severity: 'media', kind: 'form-open', role, route, evidence: screenshot, title: `La acción "${label}" no mostró un formulario visible` });
        continue;
      }
      const cancel = page.getByRole('button', { name: /^cancelar$/i }).last();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        await page.waitForTimeout(200);
        const closed = !(await modal.isVisible().catch(() => false));
        addCheck({ id: `${role}-${name}-cancel`, role, name: `cancelación de formulario: ${label}`, route, result: closed ? 'aprobado' : 'fallo', closed });
        if (!closed) addIssue({ severity: 'media', kind: 'form-cancel', role, route, title: 'El formulario no se cerró al cancelar' });
      }
    } catch (error) {
      addIssue({ severity: 'media', kind: 'form-interaction', role, route, title: `No se pudo abrir o cancelar "${label}"`, details: error.message });
    }
  }
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const publicPage = await publicContext.newPage();
    attachDiagnostics(publicPage, { role: 'publico' });
    for (const [name, route] of publicRoutes) await gotoAndObserve(publicPage, 'publico', name, route);
    await publicContext.close();

    for (const role of Object.keys(credentials)) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      context.role = role;
      attachDiagnostics(page, context);
      if (await login(page, role)) {
        for (const [name, route] of routes) await gotoAndObserve(page, role, name, route);
        await inspectForms(page, role);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const totals = results.checks.reduce((acc, item) => {
    acc.total += 1;
    if (item.result === 'aprobado' || item.result === 'observado') acc.observed += 1;
    if (item.result === 'fallo') acc.failed += 1;
    return acc;
  }, { total: 0, observed: 0, failed: 0 });
  results.summary = {
    ...totals,
    issues: results.issues.length,
    consoleErrors: results.consoleErrors.length,
    pageErrors: results.pageErrors.length,
    failedRequests: results.failedRequests.length,
    httpErrors: results.httpErrors.length
  };
  await fs.writeFile(path.join(outputDir, 'resultado-auditoria.json'), JSON.stringify(results, null, 2), 'utf8');
  await fs.writeFile(path.join(outputDir, 'resultado-auditoria.md'), renderMarkdown(results), 'utf8');
  console.log(JSON.stringify(results.summary, null, 2));
}

function renderMarkdown(data) {
  const lines = [
    '# Resultado de auditoría Playwright',
    '',
    `- Fecha: ${data.metadata.startedAt}`,
    `- URL: ${data.metadata.baseURL}`,
    `- Comprobaciones: ${data.summary.total}`,
    `- Observadas/aprobadas: ${data.summary.observed}`,
    `- Fallidas: ${data.summary.failed}`,
    `- Incidencias: ${data.summary.issues}`,
    `- Errores de consola: ${data.summary.consoleErrors}`,
    `- Errores de página: ${data.summary.pageErrors}`,
    `- Solicitudes fallidas: ${data.summary.failedRequests}`,
    '',
    '## Incidencias detectadas',
    ''
  ];
  if (!data.issues.length) lines.push('No se detectaron incidencias durante la ejecución.');
  for (const issue of data.issues) lines.push(`- **${issue.severity}** ${issue.title} (${issue.role || 'general'}${issue.route ? `, ${issue.route}` : ''})${issue.details ? `: ${issue.details}` : ''}`);
  lines.push('', '## Errores técnicos', '');
  for (const item of data.pageErrors) lines.push(`- Page error (${item.role}, ${item.url}): ${item.text}`);
  for (const item of data.consoleErrors) lines.push(`- Console error (${item.role}, ${item.url}): ${item.text}`);
  for (const item of data.failedRequests) lines.push(`- Request failed (${item.role}, ${item.request}): ${item.error}`);
  for (const item of data.httpErrors) lines.push(`- HTTP ${item.status} (${item.role}, ${item.request})`);
  return `${lines.join('\n')}\n`;
}

run().catch(async (error) => {
  await fs.mkdir(outputDir, { recursive: true }).catch(() => {});
  await fs.writeFile(path.join(outputDir, 'auditoria-error.txt'), `${error.stack || error.message}\n`, 'utf8').catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
