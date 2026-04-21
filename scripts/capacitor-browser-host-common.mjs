import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEMO_STAGE1_REPO_ROOT = path.resolve(__dirname, '..');
export const BROWSER_ROOT = path.resolve(process.env.AXOLYNC_BROWSER_ROOT || path.join(DEMO_STAGE1_REPO_ROOT, '..', 'axolync-browser'));
export const DEMO_URL = process.env.DEMO_URL || 'http://127.0.0.1:4173';

export function resolveBrowserPath(...segments) {
  return path.resolve(BROWSER_ROOT, ...segments);
}

async function importFromBrowserRepo(...segments) {
  return import(pathToFileURL(resolveBrowserPath(...segments)).href);
}

async function withBrowserCwd(action) {
  const previousCwd = process.cwd();
  process.chdir(BROWSER_ROOT);
  try {
    return await action();
  } finally {
    process.chdir(previousCwd);
  }
}

export async function startBrowserDevServer() {
  const { startDevServer } = await importFromBrowserRepo('demo', 'runner', 'common.mjs');
  return withBrowserCwd(() => startDevServer());
}

export async function stopBrowserDevServer(child) {
  const { stopDevServer } = await importFromBrowserRepo('demo', 'runner', 'common.mjs');
  return stopDevServer(child);
}

export async function installBrowserDemoPlugins(page) {
  const { installDemoPlugins } = await importFromBrowserRepo('demo', 'runner', 'common.mjs');
  return withBrowserCwd(() => installDemoPlugins(page));
}

export async function startBrowserMockPluginApiServer() {
  const { startMockPluginApiServer } = await importFromBrowserRepo('demo', 'openapi', 'mock-plugin-api.mjs');
  return startMockPluginApiServer();
}

export function createCapacitorBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${resolveBrowserPath('demo', 'assets', 'demo_track.wav')}`,
    ],
  });
}

export async function waitForReady(page) {
  await page.waitForFunction(() => document.body?.dataset?.appState === 'Ready', null, { timeout: 20000 });
  await page.waitForTimeout(1000);
}

export async function assertVisibleLyrics(page, scenarioName) {
  const snapshot = await page.evaluate(() => ({
    state: document.body?.dataset?.appState ?? null,
    status: document.querySelector('.status-label')?.textContent?.trim() ?? null,
    lyricUnitCount: document.querySelectorAll('.lyric-unit').length,
    lyricText: document.querySelector('#lyric-display')?.textContent?.trim() ?? null,
    activePlugins: localStorage.getItem('axolync_activePlugins'),
  }));

  if (snapshot.state !== 'Ready') {
    throw new Error(`${scenarioName}: expected Ready, got ${JSON.stringify(snapshot)}`);
  }
  if (snapshot.lyricUnitCount < 3) {
    throw new Error(`${scenarioName}: expected visible lyric units, got ${JSON.stringify(snapshot)}`);
  }
  if (!snapshot.lyricText || !snapshot.lyricText.includes('House of the Rising Sun')) {
    throw new Error(`${scenarioName}: expected lyric text, got ${JSON.stringify(snapshot)}`);
  }

  return snapshot;
}
