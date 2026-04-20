import { defineAdapter } from '../../scripts/stage1-addon-authoring.mjs';
import { SongMetadataDemoAdapter } from './index.js';

export default defineAdapter({
  adapterId: 'SongMetadataDemoAdapter',
  label: 'SongMetadata Demo Adapter',
  description: 'Deterministic local SongMetadata adapter that contributes canonical duration for the built-in House demo song.',
  hostMode: 'local-js',
  supportedPlatforms: ['web', 'android', 'desktop', 'ios'],
  requiredPermissions: [],
  requiredHostCapabilities: [],
  implementation: SongMetadataDemoAdapter,
  sourceFileUrl: new URL('./index.js', import.meta.url),
  bundlePath: 'adapters/SongMetadataDemoAdapter/index.js',
  queryMethods: {
    songmetadata: {
      query_song_metadata: SongMetadataDemoAdapter.prototype.query_song_metadata,
    },
  },
});
