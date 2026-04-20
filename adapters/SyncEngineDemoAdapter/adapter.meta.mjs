import { defineAdapter } from '../../scripts/stage1-addon-authoring.mjs';
import { SyncEngineDemoAdapter } from './index.js';

export default defineAdapter({
  adapterId: 'SyncEngineDemoAdapter',
  label: 'SyncEngine Demo Adapter',
  description: 'Deterministic local SyncEngine adapter with optional sync-loss simulation.',
  hostMode: 'local-js',
  supportedPlatforms: ['web', 'android', 'desktop', 'ios'],
  requiredPermissions: [],
  requiredHostCapabilities: [],
  settings: [
    {
      settingId: 'simulate_sync_loss',
      label: 'Simulate Sync Loss',
      kind: 'boolean',
      description: 'Trigger the staged sync-loss timeline used by the current demo flow.',
      defaultValue: false,
    },
    {
      settingId: 'disabled',
      label: 'Disable SyncEngine',
      kind: 'boolean',
      description: 'Disable SyncEngine contribution while keeping the addon installed.',
      defaultValue: false,
    },
  ],
  implementation: SyncEngineDemoAdapter,
  sourceFileUrl: new URL('./index.js', import.meta.url),
  bundlePath: 'adapters/SyncEngineDemoAdapter/index.js',
  queryMethods: {
    syncengine: {
      query_sync_position: SyncEngineDemoAdapter.prototype.query_sync_position,
    },
  },
});
