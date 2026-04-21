import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertVisibleLyrics,
  createCapacitorBrowser,
  installBrowserDemoPlugins,
  resolveBrowserPath,
  startBrowserMockPluginApiServer,
  waitForReady,
} from './capacitor-browser-host-common.mjs';

const BUNDLE_ROOT = resolveBrowserPath('dist');
const BUNDLE_URL = 'http://127.0.0.1:4178';
const MIME_TYPES = new Map([
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.ts', 'text/javascript'],
  ['.css', 'text/css'],
  ['.json', 'application/json'],
  ['.ogg', 'audio/ogg'],
  ['.wav', 'audio/wav'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.zip', 'application/zip'],
]);

function createStaticBundleServer(rootDir, runtimeConfig) {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', BUNDLE_URL);
    if (req.method === 'GET' && url.pathname === '/__axolync/runtime-bridge-config') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(runtimeConfig));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/__axolync/dev-bridge-log') {
      res.writeHead(204);
      res.end();
      return;
    }

    let filePath = path.join(rootDir, decodeURIComponent(url.pathname));
    if (url.pathname === '/' || url.pathname === '') {
      filePath = path.join(rootDir, 'index.html');
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES.get(ext) ?? 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    }
  });
}

async function startBundleServer(runtimeConfig) {
  const server = createStaticBundleServer(BUNDLE_ROOT, runtimeConfig);
  await new Promise((resolve) => server.listen(4178, '127.0.0.1', resolve));
  return server;
}

async function stopBundleServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(() => resolve()));
}

async function assertDeveloperModeControls(page, scenarioName) {
  await page.click('#settings-btn');
  await page.waitForSelector('#plugin-manager-modal');
  await page.waitForSelector('#manual-drag-snap-expiry-input');
  const snapshot = await page.evaluate(() => ({
    hasDeveloperToggle: Boolean(document.querySelector('#developer-mode-toggle')),
    developerToggleChecked: (document.querySelector('#developer-mode-toggle') instanceof HTMLInputElement)
      ? document.querySelector('#developer-mode-toggle').checked
      : null,
    hasSnapExpiry: Boolean(document.querySelector('#manual-drag-snap-expiry-input')),
  }));
  if (!snapshot.hasDeveloperToggle || snapshot.developerToggleChecked !== true) {
    throw new Error(`${scenarioName}: developer mode was not available in packaged debug runtime ${JSON.stringify(snapshot)}`);
  }
  if (!snapshot.hasSnapExpiry) {
    throw new Error(`${scenarioName}: Snap Expiry control was hidden in packaged debug runtime ${JSON.stringify(snapshot)}`);
  }
}

async function openPackagedCapacitorDemo(page) {
  await page.goto(`${BUNDLE_URL}/?axolync_runtime=capacitor`, { waitUntil: 'networkidle' });
  await installBrowserDemoPlugins(page);
  await page.reload({ waitUntil: 'networkidle' });
}

async function runMixedAddonScenario(page) {
  await openPackagedCapacitorDemo(page);
  await page.evaluate(() => {
    localStorage.setItem('axolync_activePlugins', JSON.stringify({
      songsense: 'demo-songsense',
      syncengine: 'demo-stage1-addon',
      lyricflow: 'demo-stage1-addon',
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('#start-btn');
  await waitForReady(page);
  const snapshot = await assertVisibleLyrics(page, 'packaged-mixed-demo-addon-capacitor');
  const activePlugins = JSON.parse(snapshot.activePlugins || '{}');
  if (activePlugins.syncengine !== 'demo-syncengine' || activePlugins.lyricflow !== 'demo-lyricflow') {
    throw new Error(`packaged-mixed-demo-addon-capacitor: expected deterministic demo fallback ${JSON.stringify(activePlugins)}`);
  }
  await assertDeveloperModeControls(page, 'packaged-mixed-demo-addon-capacitor');
  console.log(`[demo:test] packaged-mixed-demo-addon-capacitor-fallback | state=${snapshot.state} lyricUnits=${snapshot.lyricUnitCount}`);
}

let server;
let browser;
let context;
let mockApi;

try {
  if (!fs.existsSync(path.join(BUNDLE_ROOT, 'index.html'))) {
    throw new Error('dist/index.html is missing in axolync-browser. Run `npm run build` there before the packaged capacitor regression test.');
  }

  mockApi = await startBrowserMockPluginApiServer();
  const mockUrl = `${mockApi.baseUrl}/`;
  server = await startBundleServer({
    host: '127.0.0.1',
    ports: {
      host: '127.0.0.1',
      browserDevPort: 4178,
      desktopDevPort: 4178,
      songsenseBackendPort: new URL(mockApi.baseUrl).port,
      syncengineBackendPort: new URL(mockApi.baseUrl).port,
      lyricflowBackendPort: new URL(mockApi.baseUrl).port,
    },
    baseUrls: {
      songsense: mockUrl,
      syncengine: mockUrl,
      lyricflow: mockUrl,
    },
    backendUrls: {
      songsense: mockUrl,
      syncengine: mockUrl,
      lyricflow: mockUrl,
    },
    devLogEndpoint: '/__axolync/dev-bridge-log',
  });
  browser = await createCapacitorBrowser();

  context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('Failed to load demo lyrics from demo-lyricflow plugin')) {
      console.error(`[browser:packaged-capacitor:${msg.type()}] ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    console.error(`[browser:packaged-capacitor:pageerror] ${error.message}`);
  });
  page.on('requestfailed', (request) => {
    console.error(
      `[browser:packaged-capacitor:requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`
    );
  });
  await page.addInitScript(() => {
    window.__AXOLYNC_BUILD_FLAVOR = 'debug';
    window.__AXOLYNC_DEVELOPER_MODE_EXPOSED = true;
    window.__AXOLYNC_BUILTIN_DEMO_SEEDED = true;
  });

  await runMixedAddonScenario(page);

  console.log('[demo:test] packaged capacitor addon runtime regression guard passed');
} finally {
  if (context) {
    await Promise.race([
      context.close(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }
  if (browser) {
    await Promise.race([
      browser.close(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }
  await stopBundleServer(server);
  if (mockApi) {
    await mockApi.stop();
  }
}
