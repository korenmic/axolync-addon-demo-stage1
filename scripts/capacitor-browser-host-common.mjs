import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import {
  DEMO_URL as BROWSER_DEMO_URL,
  installDemoPlugins as browserInstallDemoPlugins,
  startDevServer as browserStartDevServer,
  stopDevServer as browserStopDevServer,
} from '../../axolync-browser/demo/runner/common.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEMO_STAGE1_REPO_ROOT = path.resolve(__dirname, '..');
export const BROWSER_ROOT = path.resolve(DEMO_STAGE1_REPO_ROOT, '..', 'axolync-browser');
export const DEMO_URL = process.env.DEMO_URL || BROWSER_DEMO_URL;

export function resolveBrowserPath(...segments) {
  return path.resolve(BROWSER_ROOT, ...segments);
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
  return withBrowserCwd(() => browserStartDevServer());
}

export async function stopBrowserDevServer(child) {
  return browserStopDevServer(child);
}

export async function installBrowserDemoPlugins(page) {
  return withBrowserCwd(() => browserInstallDemoPlugins(page));
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
