const DEFAULT_DETECTION_DELAY_MS = 3000;
const HOUSE_OF_THE_RISING_SUN_ID = 'House of the Rising Sun';
const DO_THE_EVOLUTION_ID = 'Pearl Jam - Do the Evolution';

const DEMO_IDENTITIES = {
  [HOUSE_OF_THE_RISING_SUN_ID]: {
    songId: HOUSE_OF_THE_RISING_SUN_ID,
    title: 'House of the Rising Sun',
    artist: 'The Animals',
    confidence: 0.95,
    popularity: 100,
  },
  [DO_THE_EVOLUTION_ID]: {
    songId: DO_THE_EVOLUTION_ID,
    title: 'Do the Evolution',
    artist: 'Pearl Jam',
    confidence: 0.99,
    popularity: 95,
  },
};

const DEMO_SELECTION_ALIASES = {
  'house of the rising sun': HOUSE_OF_THE_RISING_SUN_ID,
  'pearl jam - do the evolution': DO_THE_EVOLUTION_ID,
};

function normalizeSongSelector(rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) return '';
  if (DEMO_IDENTITIES[value]) {
    return value;
  }
  const lowered = value.toLowerCase();
  if (DEMO_SELECTION_ALIASES[lowered]) {
    return DEMO_SELECTION_ALIASES[lowered];
  }
  return value;
}

function resolveSelectedIdentity(input = {}) {
  const settings = input.settings ?? {};
  const normalizedOverride = normalizeSongSelector(
    input.songOverride
    ?? input.demo_song_override
    ?? settings.song_override
  );
  if (normalizedOverride && DEMO_IDENTITIES[normalizedOverride]) {
    return {
      ...DEMO_IDENTITIES[normalizedOverride],
      source: 'demo-deterministic-override',
    };
  }

  const selectedSongId = normalizeSongSelector(
    input.selectedSongId
    ?? input.songId
    ?? input.demo_song_id
    ?? settings.song_id
    ?? HOUSE_OF_THE_RISING_SUN_ID
  );
  if (selectedSongId && DEMO_IDENTITIES[selectedSongId]) {
    return {
      ...DEMO_IDENTITIES[selectedSongId],
      source: 'demo-deterministic',
    };
  }

  return {
    ...DEMO_IDENTITIES[HOUSE_OF_THE_RISING_SUN_ID],
    source: normalizedOverride ? 'demo-deterministic-fallback' : 'demo-deterministic',
  };
}

export class SongSenseDemoAdapter {
  constructor() {
    this.firstQueryAtMs = null;
  }

  async query_song_candidates(input = {}) {
    const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
    if (this.firstQueryAtMs === null) {
      this.firstQueryAtMs = nowMs;
    }

    if ((nowMs - this.firstQueryAtMs) < DEFAULT_DETECTION_DELAY_MS) {
      return [];
    }

    return [resolveSelectedIdentity(input)];
  }

  reset() {
    this.firstQueryAtMs = null;
  }
}
