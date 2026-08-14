import { describe, expect, it } from 'vitest';
import { ciSuccessRate, flakyTestRate, medianTimeToGreen } from '../index.js';
import type { WorkflowRun } from '../index.js';

const at = (iso: string): Date => new Date(iso);

function run(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    workflowId: 1,
    conclusion: 'success',
    startedAt: at('2026-06-01T10:00:00Z'),
    completedAt: at('2026-06-01T10:05:00Z'),
    attempt: 1,
    ...overrides,
  };
}

describe('CI/CD value-engine metrics', () => {
  it('returns null CI success rate when there are no completed success or failure runs', () => {
    expect(ciSuccessRate([])).toBeNull();
    expect(ciSuccessRate([run({ conclusion: 'cancelled' }), run({ completedAt: null })])).toBeNull();
  });

  it('returns one for all-success completed runs', () => {
    expect(ciSuccessRate([run(), run({ workflowId: 2 })])).toBe(1);
  });

  it('returns zero for all-failure completed runs', () => {
    expect(ciSuccessRate([run({ conclusion: 'failure' }), run({ workflowId: 2, conclusion: 'failure' })])).toBe(0);
  });

  it('computes mixed CI success rate and excludes cancelled or incomplete runs', () => {
    const runs = [
      run(),
      run({ workflowId: 2, conclusion: 'failure' }),
      run({ workflowId: 3, conclusion: 'failure' }),
      run({ workflowId: 4, conclusion: 'cancelled' }),
      run({ workflowId: 5, completedAt: null }),
    ];

    expect(ciSuccessRate(runs)).toBe(0.33);
  });

  it('returns null median time to green when there are no successful first attempts', () => {
    expect(medianTimeToGreen([run({ conclusion: 'failure' }), run({ attempt: 2 })])).toBeNull();
  });

  it('computes median seconds to green from successful first-attempt runs only', () => {
    const runs = [
      run({ startedAt: at('2026-06-01T10:00:00Z'), completedAt: at('2026-06-01T10:02:00Z') }),
      run({ workflowId: 2, startedAt: at('2026-06-01T11:00:00Z'), completedAt: at('2026-06-01T11:10:00Z') }),
      run({ workflowId: 3, attempt: 2, startedAt: at('2026-06-01T12:00:00Z'), completedAt: at('2026-06-01T12:30:00Z') }),
      run({ workflowId: 4, conclusion: 'failure', startedAt: at('2026-06-01T13:00:00Z'), completedAt: at('2026-06-01T13:01:00Z') }),
    ];

    expect(medianTimeToGreen(runs)).toBe(360);
  });

  it('returns null flaky test rate when there are no completed failures', () => {
    expect(flakyTestRate([run(), run({ conclusion: 'cancelled' })])).toBeNull();
  });

  it('detects failures followed by a success on the same workflow within one hour', () => {
    const runs = [
      run({ workflowId: 1, conclusion: 'failure', completedAt: at('2026-06-01T10:00:00Z') }),
      run({ workflowId: 1, conclusion: 'success', completedAt: at('2026-06-01T10:30:00Z'), attempt: 2 }),
      run({ workflowId: 2, conclusion: 'failure', completedAt: at('2026-06-01T10:00:00Z') }),
    ];

    expect(flakyTestRate(runs)).toBe(0.5);
  });

  it('uses the one-hour flaky detection boundary inclusively', () => {
    const runs = [
      run({ workflowId: 1, conclusion: 'failure', completedAt: at('2026-06-01T10:00:00Z') }),
      run({ workflowId: 1, conclusion: 'success', completedAt: at('2026-06-01T11:00:00Z') }),
    ];

    expect(flakyTestRate(runs)).toBe(1);
  });

  it('does not mark different workflows or successes outside one hour as flaky', () => {
    const runs = [
      run({ workflowId: 1, conclusion: 'failure', completedAt: at('2026-06-01T10:00:00Z') }),
      run({ workflowId: 2, conclusion: 'success', completedAt: at('2026-06-01T10:30:00Z') }),
      run({ workflowId: 1, conclusion: 'success', completedAt: at('2026-06-01T11:00:01Z') }),
    ];

    expect(flakyTestRate(runs)).toBe(0);
  });
});
