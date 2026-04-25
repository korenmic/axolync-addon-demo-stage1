import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

const ZIP_MTIME = new Date('1980-01-01T00:00:00Z');

function ensureFunction(value, label) {
  if (typeof value !== 'function') {
    throw new TypeError(`${label} must be a function or class reference.`);
  }
}

function ensureNonEmptyString(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return normalized;
}

export function defineAdapter(definition) {
  const adapterId = ensureNonEmptyString(definition?.adapterId, 'adapterId');
  const implementation = definition?.implementation;
  ensureFunction(implementation, `${adapterId}.implementation`);

  const bundlePath = ensureNonEmptyString(definition?.bundlePath, `${adapterId}.bundlePath`);
  const sourceFileUrl = definition?.sourceFileUrl;
  if (!(sourceFileUrl instanceof URL)) {
    throw new TypeError(`${adapterId}.sourceFileUrl must be a URL.`);
  }

  const queryMethods = definition?.queryMethods ?? {};
  for (const [lane, methods] of Object.entries(queryMethods)) {
    if (!methods || typeof methods !== 'object') {
      throw new TypeError(`${adapterId}.queryMethods.${lane} must be an object of function refs.`);
    }
    for (const [queryMethodId, methodRef] of Object.entries(methods)) {
      ensureFunction(methodRef, `${adapterId}.queryMethods.${lane}.${queryMethodId}`);
    }
  }

  return Object.freeze({
    adapterId,
    label: ensureNonEmptyString(definition?.label, `${adapterId}.label`),
    description: typeof definition?.description === 'string' ? definition.description : undefined,
    hostMode: ensureNonEmptyString(definition?.hostMode ?? 'local-js', `${adapterId}.hostMode`),
    supportedPlatforms: Object.freeze([...(definition?.supportedPlatforms ?? [])]),
    requiredPermissions: Object.freeze([...(definition?.requiredPermissions ?? [])]),
    requiredHostCapabilities: Object.freeze([...(definition?.requiredHostCapabilities ?? [])]),
    gatingSettings: Object.freeze([...(definition?.gatingSettings ?? [])]),
    settings: Object.freeze([...(definition?.settings ?? [])]),
    implementation,
    bundlePath,
    sourceFileUrl,
    queryMethods: Object.freeze(queryMethods),
  });
}

export function defineAddon(definition) {
  return Object.freeze({
    addonId: ensureNonEmptyString(definition?.addonId, 'addonId'),
    name: ensureNonEmptyString(definition?.name, 'name'),
    version: ensureNonEmptyString(definition?.version, 'version'),
    contractsVersion: ensureNonEmptyString(definition?.contractsVersion, 'contractsVersion'),
    description: typeof definition?.description === 'string' ? definition.description : undefined,
    requirements: Object.freeze([...(definition?.requirements ?? [])]),
    adapters: Object.freeze([...(definition?.adapters ?? [])]),
  });
}

function normalizeSetting(setting) {
  return {
    setting_id: ensureNonEmptyString(setting?.settingId ?? setting?.setting_id, 'setting.settingId'),
    label: ensureNonEmptyString(setting?.label, `setting.${setting?.settingId ?? setting?.setting_id}.label`),
    kind: ensureNonEmptyString(setting?.kind, `setting.${setting?.settingId ?? setting?.setting_id}.kind`),
    description: typeof setting?.description === 'string' ? setting.description : undefined,
    hidden_in_ui: setting?.hiddenInUi === true,
    default_value: setting?.defaultValue,
    enum_values: Array.isArray(setting?.enumValues) ? [...setting.enumValues] : undefined,
  };
}

function toManifestQueryMethods(queryMethods) {
  const manifestQueryMethods = {};
  for (const [lane, methods] of Object.entries(queryMethods ?? {})) {
    manifestQueryMethods[lane] = Object.keys(methods);
  }
  return manifestQueryMethods;
}

export function buildManifestFromAddonDefinition(addon) {
  return {
    addon: {
      addon_id: addon.addonId,
      name: addon.name,
      version: addon.version,
      contracts_version: addon.contractsVersion,
      description: addon.description,
      requirements: [...addon.requirements],
      adapters: addon.adapters.map((adapter) => ({
        adapter_id: adapter.adapterId,
        label: adapter.label,
        description: adapter.description,
        host_mode: adapter.hostMode,
        supported_platforms: [...adapter.supportedPlatforms],
        required_permissions: [...adapter.requiredPermissions],
        required_host_capabilities: [...adapter.requiredHostCapabilities],
        gating_settings: [...adapter.gatingSettings],
        settings: adapter.settings.map(normalizeSetting),
        implementation: {
          module_path: adapter.bundlePath,
          export_name: adapter.implementation.name,
        },
        query_methods: toManifestQueryMethods(adapter.queryMethods),
      })),
    },
  };
}

export function collectBundleFiles(addon) {
  return addon.adapters.map((adapter) => {
    const sourcePath = fileURLToPath(adapter.sourceFileUrl);
    const contents = fs.readFileSync(sourcePath, 'utf8');
    return {
      name: adapter.bundlePath,
      contents,
    };
  });
}

export function buildStage1AddonZipBuffer(addon) {
  const manifest = buildManifestFromAddonDefinition(addon);
  const files = collectBundleFiles(addon);
  const archive = {
    'manifest.json': strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
  };
  for (const file of files) {
    archive[file.name] = strToU8(file.contents);
  }
  return {
    manifest,
    zipBuffer: Buffer.from(zipSync(archive, { mtime: ZIP_MTIME })),
    files,
  };
}

export function resolveAddonRoot(relativeFromFileUrl, ...segments) {
  return path.resolve(path.dirname(fileURLToPath(relativeFromFileUrl)), ...segments);
}
