import { defineAddon } from './scripts/stage1-addon-authoring.mjs';
import songSenseAdapter from './adapters/SongSenseDemoAdapter/adapter.meta.mjs';
import syncEngineAdapter from './adapters/SyncEngineDemoAdapter/adapter.meta.mjs';
import lyricFlowAdapter from './adapters/LyricFlowDemoAdapter/adapter.meta.mjs';
import songMetadataAdapter from './adapters/SongMetadataDemoAdapter/adapter.meta.mjs';

export default defineAddon({
  addonId: 'demo-stage1-addon',
  name: 'Demo Stage 1 Addon',
  version: '1.0.0-demo',
  contractsVersion: '2.0.0',
  description: 'Packaged Stage 1 addon that proves one ZIP can host SongSense, SyncEngine, LyricFlow, and SongMetadata adapters.',
  requirements: [],
  adapters: [
    songSenseAdapter,
    syncEngineAdapter,
    lyricFlowAdapter,
    songMetadataAdapter,
  ],
});
