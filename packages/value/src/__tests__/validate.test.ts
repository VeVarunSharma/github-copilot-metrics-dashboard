import { describe, expect, it } from 'vitest';
import { DEFAULT_KNOBS, snapshotKnobs, validateKnobs } from '../index.js';

describe('validateKnobs', () => {
  it('accepts DEFAULT_KNOBS', () => {
    expect(validateKnobs(DEFAULT_KNOBS)).toEqual({ ok: true });
  });

  it('rejects blend weights that do not sum to 1.0 within tolerance', () => {
    const result = validateKnobs({
      ...DEFAULT_KNOBS,
      blend: { activity: 0.33, output: 0.33, delivery: 0.33 },
    });

    expect(result.ok).toBe(false);
    expect(result).toEqual({
      ok: false,
      errors: ['blend weights must sum to 1.0 within 0.001; received 0.99'],
    });
  });

  it('rejects negative avgLoadedEngCostPerHour', () => {
    const result = validateKnobs({ ...DEFAULT_KNOBS, avgLoadedEngCostPerHour: -1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('avgLoadedEngCostPerHour must be >= 0');
    }
  });

  it('rejects an empty currency string', () => {
    const result = validateKnobs({ ...DEFAULT_KNOBS, currency: '   ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('currency must be a non-empty string');
    }
  });
});

describe('snapshotKnobs', () => {
  it('serializes knobs as deterministic JSON with sorted keys', () => {
    const knobs = {
      ...DEFAULT_KNOBS,
      blend: { output: 0, delivery: 1, activity: 0 },
    };

    expect(snapshotKnobs(knobs)).toBe(
      '{"avgLoadedEngCostPerHour":100,"blend":{"activity":0,"delivery":1,"output":0},"currency":"USD","locPerHourBaseline":30,"minPerAcceptedCompletion":0.75,"minPerAgentSession":30,"minPerChatRequest":2,"minSavedPerAuthoredPr":60,"minSavedPerReviewedPr":15}',
    );
  });

  it('returns the same snapshot for equivalent objects with different insertion orders', () => {
    const left = {
      currency: 'USD',
      avgLoadedEngCostPerHour: 100,
      minPerAcceptedCompletion: 0.75,
      minPerChatRequest: 2,
      minPerAgentSession: 30,
      minSavedPerAuthoredPr: 60,
      minSavedPerReviewedPr: 15,
      locPerHourBaseline: 30,
      blend: { activity: 0, output: 0, delivery: 1 },
    };
    const right = {
      blend: { delivery: 1, output: 0, activity: 0 },
      locPerHourBaseline: 30,
      minSavedPerReviewedPr: 15,
      minSavedPerAuthoredPr: 60,
      minPerAgentSession: 30,
      minPerChatRequest: 2,
      minPerAcceptedCompletion: 0.75,
      avgLoadedEngCostPerHour: 100,
      currency: 'USD',
    };

    expect(snapshotKnobs(left)).toBe(snapshotKnobs(right));
  });
});
