import { defineAdapter } from '../../scripts/stage1-addon-authoring.mjs';
import { SongSenseDemoAdapter } from './index.js';

export default defineAdapter({
  adapterId: 'SongSenseDemoAdapter',
  label: 'SongSense Demo Adapter',
  description: 'Deterministic local SongSense adapter used to prove Stage 1 ZIP hosting.',
  hostMode: 'local-js',
  supportedPlatforms: ['web', 'android', 'desktop', 'ios'],
  requiredPermissions: [],
  requiredHostCapabilities: [],
  settings: [
    {
      settingId: 'song_id',
      label: 'Preset Song',
      kind: 'enum',
      description: 'Select one of the built-in deterministic demo songs when no text override is entered.',
      defaultValue: 'House of the Rising Sun',
      enumValues: [
        'House of the Rising Sun',
        'Pearl Jam - Do the Evolution',
      ],
    },
    {
      settingId: 'song_override',
      label: 'Song Override',
      kind: 'string',
      description: 'Optional free-text override. When filled, the preset song selector is disabled.',
      defaultValue: '',
    },
  ],
  implementation: SongSenseDemoAdapter,
  sourceFileUrl: new URL('./index.js', import.meta.url),
  bundlePath: 'adapters/SongSenseDemoAdapter/index.js',
  queryMethods: {
    songsense: {
      query_song_candidates: SongSenseDemoAdapter.prototype.query_song_candidates,
    },
  },
});
