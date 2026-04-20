const HOUSE_OF_THE_RISING_SUN_LRC = `[ti:House of the Rising Sun (Instrumental Synth Version)]
[ar:Anonimo (Synth arrangement)]
[al:Public Domain]
[length:02:51]
[offset:0]

[00:07.50]There is a house in New Orleans
[00:14.00]They call the Rising Sun
[00:20.50]And it's been the ruin of many a poor boy
[00:27.50]And God, I know I'm one

[00:35.00]My mother was a tailor
[00:41.50]She sewed my new blue jeans
[00:48.00]My father was a gamblin' man
[00:54.50]Down in New Orleans

[01:02.00]Now the only thing a gambler needs
[01:08.50]Is a suitcase and a trunk
[01:15.00]And the only time he's satisfied
[01:21.50]Is when he's on a drunk

[01:29.00][Instrumental swell / middle section]

[01:50.00]Oh mother tell your children
[01:56.50]Not to do what I have done
[02:03.00]Spend your lives in sin and misery
[02:10.00]In the House of the Rising Sun

[02:18.00]Well, there is a house in New Orleans
[02:24.50]They call the Rising Sun
[02:31.00]And it's been the ruin of many a poor boy
[02:38.00]And God, I know I'm one

[02:45.00][Fade / final arpeggios]
`;

const WORD_FIXTURE_LINE_UNITS = [
  { text: 'now we stand ready', inSongMs: 0, durationMs: 2000 },
  { text: 'for sync lyrics', inSongMs: 2000, durationMs: 1700 },
];

const WORD_FIXTURE_WORD_UNITS = [
  { text: 'now', inSongMs: 0, durationMs: 400 },
  { text: 'we', inSongMs: 400, durationMs: 400 },
  { text: 'stand', inSongMs: 800, durationMs: 500 },
  { text: 'ready\n', inSongMs: 1300, durationMs: 700 },
  { text: 'for', inSongMs: 2000, durationMs: 400 },
  { text: 'sync', inSongMs: 2400, durationMs: 600 },
  { text: 'lyrics\n', inSongMs: 3000, durationMs: 700 },
];

function parseTimestampToMs(rawValue) {
  const match = String(rawValue).match(/^(\d+):(\d{2})\.(\d{2})$/);
  if (!match) return null;
  const [, minutes, seconds, centiseconds] = match;
  return (Number(minutes) * 60 * 1000) + (Number(seconds) * 1000) + (Number(centiseconds) * 10);
}

function parseLrcToLineUnits(lrcText) {
  const rows = [];
  for (const rawLine of String(lrcText).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('[')) continue;
    const match = line.match(/^\[(\d+:\d{2}\.\d{2})](.*)$/);
    if (!match) continue;
    const timestampMs = parseTimestampToMs(match[1]);
    const text = match[2].trim();
    if (timestampMs === null || !text || text.startsWith('[')) continue;
    rows.push({ timestampMs, text });
  }

  return rows.map((row, index) => {
    const next = rows[index + 1];
    const durationMs = Math.max(1200, (next?.timestampMs ?? (row.timestampMs + 6500)) - row.timestampMs);
    return {
      text: row.text,
      inSongMs: row.timestampMs,
      durationMs,
    };
  });
}

function synthesizeWordUnits(lineUnits) {
  const wordUnits = [];
  for (const line of lineUnits) {
    const words = line.text.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const totalLetters = words.reduce((sum, word) => sum + word.replace(/[^A-Za-z0-9']/g, '').length, 0) || words.length;
    let cursor = line.inSongMs;
    words.forEach((word, index) => {
      const weight = Math.max(1, word.replace(/[^A-Za-z0-9']/g, '').length);
      const remainingWords = words.length - index;
      const remainingDuration = (line.inSongMs + line.durationMs) - cursor;
      const durationMs = index === words.length - 1
        ? remainingDuration
        : Math.max(220, Math.round((line.durationMs * weight) / totalLetters));
      const suffix = index === words.length - 1 ? '\n' : '';
      wordUnits.push({
        text: `${word}${suffix}`,
        inSongMs: cursor,
        durationMs,
      });
      cursor += durationMs;
    });
  }
  return wordUnits;
}

const HOUSE_LINE_UNITS = parseLrcToLineUnits(HOUSE_OF_THE_RISING_SUN_LRC);
const HOUSE_WORD_UNITS = synthesizeWordUnits(HOUSE_LINE_UNITS);
const HOUSE_OF_THE_RISING_SUN_ID = 'House of the Rising Sun';
const WORD_FIXTURE_ID = 'word-fixture-demo';
const HOUSE_AUDIO_ASSET_PATH = '/demo/assets/house_of_the_rising_sun_instrumental.ogg';
export const DEMO_SONGMETADATA_FALLBACK_PADDING_MS = 10000;
let cachedHouseAudioDurationPromise = null;

const SONGS = {
  [HOUSE_OF_THE_RISING_SUN_ID]: {
    line: HOUSE_LINE_UNITS,
    word: HOUSE_WORD_UNITS,
  },
  [WORD_FIXTURE_ID]: {
    line: WORD_FIXTURE_LINE_UNITS,
    word: WORD_FIXTURE_WORD_UNITS,
  },
};

function cloneLyricUnits(units) {
  return units.map((unit) => ({ ...unit }));
}

function getLyricCoverageEndMs(units) {
  return units.reduce((maxEndMs, unit) => {
    const inSongMs = Number(unit?.inSongMs);
    const durationMs = Number(unit?.durationMs);
    if (!Number.isFinite(inSongMs) || !Number.isFinite(durationMs)) {
      return maxEndMs;
    }
    return Math.max(maxEndMs, inSongMs + durationMs);
  }, 0);
}

export const DEMO_HOUSE_MAX_LYRIC_END_MS = getLyricCoverageEndMs(HOUSE_LINE_UNITS);

function resolveSelectedSessionContext(input = {}) {
  return input.sessionContext
    ?? input.session_context
    ?? input.settings?.sessionContext
    ?? input.settings?.session_context
    ?? null;
}

function normalizeSongId(rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) return HOUSE_OF_THE_RISING_SUN_ID;
  if (SONGS[value]) return value;

  const lowered = value.toLowerCase();
  if (lowered === 'house of the rising sun' || lowered === 'the animals - house of the rising sun') {
    return HOUSE_OF_THE_RISING_SUN_ID;
  }
  return HOUSE_OF_THE_RISING_SUN_ID;
}

function normalizeGranularity(rawValue) {
  return rawValue === 'word' ? 'word' : 'line';
}

function matchesHouseDemoSong(rawValue) {
  const value = String(rawValue ?? '').trim().toLowerCase();
  return value === 'house of the rising sun' || value === 'the animals - house of the rising sun';
}

function resolveSongMetadataSong(input = {}) {
  const song = input.song ?? input.settings?.song ?? null;
  if (!song || typeof song !== 'object') {
    return null;
  }

  const title = typeof song.title === 'string' ? song.title : '';
  const artist = typeof song.artist === 'string' ? song.artist : '';
  const songId = typeof song.songId === 'string' ? song.songId : '';
  if (matchesHouseDemoSong(songId) || matchesHouseDemoSong(title) || matchesHouseDemoSong(`${artist} - ${title}`)) {
    return HOUSE_OF_THE_RISING_SUN_ID;
  }

  return null;
}

function createDefaultAudioContext() {
  const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (typeof AudioContextCtor !== 'function') {
    return null;
  }
  return new AudioContextCtor();
}

export async function measureDemoAudioAssetDurationMs({
  assetPath = HOUSE_AUDIO_ASSET_PATH,
  fetchImpl = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null,
  createAudioContext = createDefaultAudioContext,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    return null;
  }
  const audioContext = createAudioContext?.();
  if (!audioContext || typeof audioContext.decodeAudioData !== 'function') {
    if (typeof audioContext?.close === 'function') {
      await audioContext.close().catch(() => {});
    }
    return null;
  }

  try {
    const response = await fetchImpl(assetPath);
    if (!response || (typeof response.ok === 'boolean' && !response.ok) || typeof response.arrayBuffer !== 'function') {
      return null;
    }
    const encoded = await response.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(encoded.slice(0));
    const durationMs = Math.round(Number(decoded?.duration ?? 0) * 1000);
    return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null;
  } catch {
    return null;
  } finally {
    if (typeof audioContext.close === 'function') {
      await audioContext.close().catch(() => {});
    }
  }
}

async function getCachedHouseAudioDurationMs() {
  if (!cachedHouseAudioDurationPromise) {
    cachedHouseAudioDurationPromise = measureDemoAudioAssetDurationMs().catch(() => null);
  }
  return cachedHouseAudioDurationPromise;
}

export function resetDemoSongMetadataDurationCache() {
  cachedHouseAudioDurationPromise = null;
}

export function resolveDemoSongMetadataDurationMs({
  measuredDurationMs,
  maxLyricEndMs = DEMO_HOUSE_MAX_LYRIC_END_MS,
  fallbackPaddingMs = DEMO_SONGMETADATA_FALLBACK_PADDING_MS,
} = {}) {
  const normalizedMeasuredDurationMs = Number(measuredDurationMs);
  if (Number.isFinite(normalizedMeasuredDurationMs) && normalizedMeasuredDurationMs > maxLyricEndMs) {
    return normalizedMeasuredDurationMs;
  }
  return maxLyricEndMs + fallbackPaddingMs;
}

export class LyricFlowDemoAdapter {
  async query_lyric_units(input = {}) {
    const sessionContext = resolveSelectedSessionContext(input);
    const songId = normalizeSongId(
      input.songId
      ?? input.settings?.song_id
      ?? input.settings?.songId
      ?? input.title
      ?? sessionContext?.title
    );
    const granularity = normalizeGranularity(input.granularity ?? input.settings?.granularity);
    const units = SONGS[songId]?.[granularity] ?? SONGS[HOUSE_OF_THE_RISING_SUN_ID].line;
    return {
      granularity,
      units: cloneLyricUnits(units),
    };
  }
}

export class SongMetadataDemoAdapter {
  async query_song_metadata(input = {}) {
    if (resolveSongMetadataSong(input) !== HOUSE_OF_THE_RISING_SUN_ID) {
      return null;
    }

    const measuredDurationMs = await getCachedHouseAudioDurationMs();
    return {
      durationMs: resolveDemoSongMetadataDurationMs({
        measuredDurationMs,
      }),
    };
  }
}
