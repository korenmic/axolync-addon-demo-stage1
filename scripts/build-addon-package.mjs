#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import addon from '../addon.meta.mjs';
import { buildStage1AddonZipBuffer } from './stage1-addon-authoring.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'output', 'local_js');
const REPORT_DIR = path.join(ROOT, 'report');
const ADDON_ID = addon.addonId;
const ZIP_NAME = `${ADDON_ID}-local_js.zip`;
const MANIFEST_NAME = `addon-manifest.${ADDON_ID}.json`;
const CONTENTS_NAME = `addon-contents.${ADDON_ID}.json`;
const SIGNATURE_NAME = `addon-source-signature.${ADDON_ID}.json`;

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildSourceSignatureRecord({ manifest, files }) {
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const logicalInputs = {
    formatVersion: 'demo-stage1-addon-logical-source-v1',
    manifest: {
      path: 'manifest.json',
      bytes: Buffer.byteLength(manifestText),
      sha256: `sha256:${sha256Hex(manifestText)}`,
    },
    files: files.map((file) => ({
      path: file.name,
      bytes: Buffer.byteLength(file.contents, 'utf8'),
      sha256: `sha256:${sha256Hex(file.contents)}`,
    })),
  };
  return {
    schemaVersion: 1,
    addonId: ADDON_ID,
    algorithm: 'sha256',
    hash: `sha256:${sha256Hex(JSON.stringify(logicalInputs))}`,
    logicalInputs,
  };
}

const { manifest, zipBuffer, files } = buildStage1AddonZipBuffer(addon);
const contents = {
  addonId: ADDON_ID,
  files: ['manifest.json', ...files.map((file) => file.name)],
};
const sourceSignature = buildSourceSignatureRecord({ manifest, files });

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const zipPath = path.join(OUTPUT_DIR, ZIP_NAME);
const manifestPath = path.join(REPORT_DIR, MANIFEST_NAME);
const contentsPath = path.join(REPORT_DIR, CONTENTS_NAME);
const signaturePath = path.join(REPORT_DIR, SIGNATURE_NAME);

fs.writeFileSync(zipPath, zipBuffer);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
fs.writeFileSync(contentsPath, `${JSON.stringify(contents, null, 2)}\n`, 'utf8');
fs.writeFileSync(signaturePath, `${JSON.stringify(sourceSignature, null, 2)}\n`, 'utf8');

process.stdout.write(`${JSON.stringify({
  addonId: ADDON_ID,
  zipPath,
  manifestPath,
  contentsPath,
  signaturePath,
}, null, 2)}\n`);

