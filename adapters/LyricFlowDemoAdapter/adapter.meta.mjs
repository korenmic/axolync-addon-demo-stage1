import { defineAdapter } from '../../scripts/stage1-addon-authoring.mjs';
import { LyricFlowDemoAdapter } from './index.js';

export default defineAdapter({
  adapterId: 'LyricFlowDemoAdapter',
  label: 'LyricFlow Demo Adapter',
  description: 'Deterministic local LyricFlow adapter that serves line and synthesized word lyric units.',
  hostMode: 'local-js',
  supportedPlatforms: ['web', 'android', 'desktop', 'ios'],
  requiredPermissions: [],
  requiredHostCapabilities: [],
  settings: [
    {
      settingId: 'return_untimed_lyrics',
      label: 'Return Untimed Lyrics',
      kind: 'boolean',
      description: 'Return plain lyrics without timing so browser paragraph synthetic timing can be tested.',
      defaultValue: false,
    },
  ],
  implementation: LyricFlowDemoAdapter,
  sourceFileUrl: new URL('./index.js', import.meta.url),
  bundlePath: 'adapters/LyricFlowDemoAdapter/index.js',
  queryMethods: {
    lyricflow: {
      query_lyric_units: LyricFlowDemoAdapter.prototype.query_lyric_units,
    },
  },
});
