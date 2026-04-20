const INITIAL_CONFIDENCE = 0.83;
const LOCKED_CONFIDENCE = 0.93;
const LOCK_DELAY_MS = 2500;
const LOSS_TIMELINE = {
  firstDesyncAt: 20000,
  relockAt: 25000,
  finalDesyncAt: 35000,
};

function normalizeBoolean(value) {
  return value === true;
}

export class SyncEngineDemoAdapter {
  constructor() {
    this.firstQueryAtMs = null;
  }

  async query_sync_position(input = {}) {
    const settings = input.settings ?? {};
    if (normalizeBoolean(settings.disabled)) {
      return null;
    }

    const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
    if (this.firstQueryAtMs === null) {
      this.firstQueryAtMs = nowMs;
    }

    const elapsed = nowMs - this.firstQueryAtMs;
    const simulateSyncLoss = normalizeBoolean(settings.simulate_sync_loss);

    if (simulateSyncLoss) {
      if (elapsed >= LOSS_TIMELINE.firstDesyncAt && elapsed < LOSS_TIMELINE.relockAt) {
        return {
          songOffsetAtBufferStartMs: 21000,
          confidence: 0.3,
        };
      }
      if (elapsed >= LOSS_TIMELINE.finalDesyncAt) {
        return {
          songOffsetAtBufferStartMs: 21000,
          confidence: 0.2,
        };
      }
    }

    return {
      songOffsetAtBufferStartMs: 21000,
      confidence: elapsed >= LOCK_DELAY_MS ? LOCKED_CONFIDENCE : INITIAL_CONFIDENCE,
    };
  }

  reset() {
    this.firstQueryAtMs = null;
  }
}
