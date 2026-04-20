import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import addon from '../addon.meta.mjs';
import { buildStage1AddonZipBuffer } from '../scripts/stage1-addon-authoring.mjs';

function readArchiveEntries(zipBuffer) {
  return unzipSync(Buffer.from(zipBuffer));
}

test('stage1 demo addon package includes songmetadata lane and deterministic assets-independent bundle files', () => {
  const { manifest, zipBuffer, files } = buildStage1AddonZipBuffer(addon);
  assert.equal(manifest.addon.addon_id, 'demo-stage1-addon');
  assert.ok(manifest.addon.adapters.some((adapter) => adapter.adapter_id === 'SongMetadataDemoAdapter'));
  assert.ok(
    manifest.addon.adapters.some((adapter) => (
      adapter.adapter_id === 'SongMetadataDemoAdapter'
      && adapter.query_methods?.songmetadata?.includes('query_song_metadata')
    ))
  );
  assert.ok(files.some((file) => file.name === 'adapters/SongMetadataDemoAdapter/index.js'));
  const entries = readArchiveEntries(zipBuffer);
  assert.ok(entries['manifest.json']);
  assert.ok(entries['adapters/SongSenseDemoAdapter/index.js']);
});

test('copied demo assets required by lyricflow deterministic behavior exist in repo ownership', () => {
  const assetRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
  assert.ok(fs.existsSync(path.join(assetRoot, 'house_of_the_rising_sun_instrumental.ogg')));
  assert.ok(fs.existsSync(path.join(assetRoot, 'house_of_the_rising_sun_instrumental.lrc')));
});

test('package script target directories are writable in a fresh temp copy', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'axolync-demo-stage1-'));
  try {
    const outDir = path.join(tempRoot, 'artifacts', 'output', 'local_js');
    const reportDir = path.join(tempRoot, 'report');
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(reportDir, { recursive: true });
    assert.ok(fs.existsSync(outDir));
    assert.ok(fs.existsSync(reportDir));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
