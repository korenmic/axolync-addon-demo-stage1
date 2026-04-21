import {
  assertVisibleLyrics,
  createCapacitorBrowser,
  DEMO_URL,
  installBrowserDemoPlugins,
  startBrowserDevServer,
  stopBrowserDevServer,
  waitForReady,
} from './capacitor-browser-host-common.mjs';

async function runPureDemoScenario(page) {
  await page.goto(`${DEMO_URL}/?axolync_runtime=capacitor`, { waitUntil: 'networkidle' });
  await installBrowserDemoPlugins(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('axolync_activePlugins', JSON.stringify({
      songsense: 'demo-songsense',
      syncengine: 'demo-syncengine',
      lyricflow: 'demo-lyricflow',
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('#start-btn');
  await waitForReady(page);
  const snapshot = await assertVisibleLyrics(page, 'pure-demo-capacitor');
  console.log(`[demo:test] pure-demo-capacitor | state=${snapshot.state} lyricUnits=${snapshot.lyricUnitCount}`);
}

async function runMixedAddonScenario(page) {
  await page.goto(`${DEMO_URL}/?axolync_runtime=capacitor`, { waitUntil: 'networkidle' });
  await installBrowserDemoPlugins(page);
  await page.reload({ waitUntil: 'networkidle' });
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
  const snapshot = await assertVisibleLyrics(page, 'mixed-demo-addon-capacitor');
  const activePlugins = JSON.parse(snapshot.activePlugins || '{}');
  if (activePlugins.syncengine !== 'demo-syncengine' || activePlugins.lyricflow !== 'demo-lyricflow') {
    throw new Error(`mixed-demo-addon-capacitor: expected deterministic demo fallback ${JSON.stringify(activePlugins)}`);
  }
  console.log(`[demo:test] mixed-demo-addon-capacitor-fallback | state=${snapshot.state} lyricUnits=${snapshot.lyricUnitCount}`);
}

async function runScenario(scenario) {
  const browser = await createCapacitorBrowser();
  try {
    const context = await browser.newContext({ permissions: ['microphone'] });
    try {
      const page = await context.newPage();
      await scenario(page);
    } finally {
      await Promise.race([
        context.close(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  } finally {
    await Promise.race([
      browser.close(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }
}

let server;

try {
  server = await startBrowserDevServer();
  await runScenario(runPureDemoScenario);
  await runScenario(runMixedAddonScenario);

  console.log('[demo:test] capacitor addon runtime regression guard passed');
} finally {
  await Promise.race([
    stopBrowserDevServer(server),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
}
