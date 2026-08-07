import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KNOBS } from '@ghcp-dash/value';
import { settings, VALUE_TRANSLATION_KNOBS_KEY } from '@ghcp-dash/db';
import { getKnobs } from '@/server/queries/common';
import { updateKnobsHandler } from '@/server/handlers/settings';
import {
  blendTotalFromDraft,
  blendWeightFields,
  knobsToDraft,
  numericKnobFields,
  validateSettingsKnobDraft,
} from '@/views/settings-knobs-form';

const { dbMock, state } = vi.hoisted(() => {
  interface InsertValues {
    key?: unknown;
    value?: unknown;
    updatedAt?: unknown;
  }

  const state = {
    knobRows: [] as Array<{ value: unknown }>,
    insertValues: undefined as InsertValues | undefined,
    conflictArgs: undefined as unknown,
    insertCalls: 0,
  };

  const dbMock = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(state.knobRows)),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: InsertValues) => {
        state.insertCalls += 1;
        state.insertValues = values;
        return {
          onConflictDoUpdate: vi.fn((args: unknown) => {
            state.conflictArgs = args;
            return Promise.resolve();
          }),
        };
      }),
    })),
  };

  return { dbMock, state };
});

vi.mock('@ghcp-dash/db', async () => {
  const actual = await vi.importActual<typeof import('@ghcp-dash/db')>('@ghcp-dash/db');
  return { ...actual, db: dbMock };
});

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAuthMode = process.env.AUTH_MODE;
const originalDashboardPassword = process.env.DASHBOARD_PASSWORD;

function identityHeaderContext() {
  return { request: { headers: new Headers({ 'x-ms-client-principal-name': 'operator@example.com' }) } };
}

describe('settings queries and handlers', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.AUTH_MODE = 'identity-header';
    delete process.env.DASHBOARD_PASSWORD;
    state.knobRows = [];
    state.insertValues = undefined;
    state.conflictArgs = undefined;
    state.insertCalls = 0;
    dbMock.select.mockClear();
    dbMock.insert.mockClear();
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    if (originalAuthMode === undefined) {
      delete process.env.AUTH_MODE;
    } else {
      process.env.AUTH_MODE = originalAuthMode;
    }
    if (originalDashboardPassword === undefined) {
      delete process.env.DASHBOARD_PASSWORD;
    } else {
      process.env.DASHBOARD_PASSWORD = originalDashboardPassword;
    }
  });

  it('reads saved knobs from the canonical value translation settings key', async () => {
    state.knobRows = [{
      value: {
        ...DEFAULT_KNOBS,
        currency: 'EUR',
        avgLoadedEngCostPerHour: 150,
        blend: { activity: 0.25, output: 0.25, delivery: 0.5 },
      },
    }];

    await expect(getKnobs()).resolves.toMatchObject({
      currency: 'EUR',
      avgLoadedEngCostPerHour: 150,
      blend: { activity: 0.25, output: 0.25, delivery: 0.5 },
    });
  });

  describe('settings knob form validation', () => {
    it('covers every current value knob and blend weight', () => {
      expect(numericKnobFields.map((field) => field.key)).toEqual([
        'avgLoadedEngCostPerHour',
        'minPerAcceptedCompletion',
        'minPerChatRequest',
        'minPerAgentSession',
        'minSavedPerAuthoredPr',
        'minSavedPerReviewedPr',
        'locPerHourBaseline',
      ]);
      expect(blendWeightFields.map((field) => field.key)).toEqual(['activity', 'output', 'delivery']);
      expect(knobsToDraft(DEFAULT_KNOBS).blend).toEqual({ activity: '0', output: '0', delivery: '1' });
    });

    it('rejects invalid numeric values before submission', () => {
      const draft = knobsToDraft(DEFAULT_KNOBS);
      draft.minPerChatRequest = '';

      const result = validateSettingsKnobDraft(draft);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected validation to fail');
      expect(result.errors).toContain('Minutes saved / chat request is required.');
    });

    it('rejects blend weights that do not sum to 1', () => {
      const draft = knobsToDraft(DEFAULT_KNOBS);
      draft.blend = { activity: '0.33', output: '0.33', delivery: '0.33' };

      const result = validateSettingsKnobDraft(draft);

      expect(blendTotalFromDraft(draft)).toBeCloseTo(0.99);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected validation to fail');
      expect(result.errors.join('\n')).toContain('blend weights must sum to 1.0');
    });

    it('returns a contract-shaped knob body for valid custom values', () => {
      const draft = knobsToDraft(DEFAULT_KNOBS);
      draft.currency = 'cad';
      draft.avgLoadedEngCostPerHour = '125';
      draft.blend = { activity: '0.5', output: '0.25', delivery: '0.25' };

      const result = validateSettingsKnobDraft(draft);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected validation to pass');
      expect(result.knobs).toMatchObject({
        currency: 'CAD',
        avgLoadedEngCostPerHour: 125,
        blend: { activity: 0.5, output: 0.25, delivery: 0.25 },
      });
    });
  });

  it('saves knobs under the collector-consumed key without claiming recompute started', async () => {
    const body = {
      ...DEFAULT_KNOBS,
      avgLoadedEngCostPerHour: 175,
      blend: { activity: 0.4, output: 0.1, delivery: 0.5 },
    };

    const response = await updateKnobsHandler({ body }, identityHeaderContext());

    expect(response.status).toBe(200);
    if (response.status !== 200) throw new Error('expected a successful settings save');

    expect(state.insertValues?.key).toBe(VALUE_TRANSLATION_KNOBS_KEY);
    expect(state.insertValues?.updatedAt).toBeInstanceOf(Date);
    expect(state.insertValues?.value).toMatchObject({ avgLoadedEngCostPerHour: 175, blend: body.blend });
    const conflictArgs = state.conflictArgs as { target?: unknown; set?: { value?: unknown; updatedAt?: unknown } };
    expect(conflictArgs.target).toBe(settings.key);
    expect(conflictArgs.set?.value).toBe(state.insertValues?.value);
    expect(conflictArgs.set?.updatedAt).toBe(state.insertValues?.updatedAt);
    expect(response.body).toMatchObject({ ok: true, savedAt: expect.any(String), recompute: { status: 'not_started' } });
    expect('recomputeStartedAt' in response.body).toBe(false);
  });

  it('does not report a save when the database is unconfigured', async () => {
    delete process.env.DATABASE_URL;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const response = await updateKnobsHandler({ body: DEFAULT_KNOBS }, identityHeaderContext());

      expect(response.status).toBe(503);
      expect(state.insertCalls).toBe(0);
      expect(response.body).toEqual({ ok: false, error: 'Settings could not be saved because the database is unavailable.' });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('rejects settings mutations when auth mode is open', async () => {
    process.env.AUTH_MODE = 'open';

    const response = await updateKnobsHandler({ body: DEFAULT_KNOBS }, identityHeaderContext());

    expect(response.status).toBe(401);
    expect(state.insertCalls).toBe(0);
    expect(response.body).toEqual({ ok: false, error: 'Settings changes require authenticated shared-password or trusted identity-header access.' });
  });
});
