import { round2 } from './estimators.js';

export interface WorkflowRun {
  workflowId: number;
  conclusion: 'success' | 'failure' | 'cancelled';
  startedAt: Date;
  completedAt: Date | null;
  attempt: number;
}

const MS_PER_SECOND = 1_000;
const MS_PER_HOUR = 3_600_000;

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function ciSuccessRate(runs: WorkflowRun[]): number | null {
  const completedRuns = runs.filter((run) => run.completedAt !== null && run.conclusion !== 'cancelled');
  if (completedRuns.length === 0) {
    return null;
  }

  const successes = completedRuns.filter((run) => run.conclusion === 'success').length;
  return round2(successes / completedRuns.length);
}

export function medianTimeToGreen(runs: WorkflowRun[]): number | null {
  const samples = runs
    .filter((run): run is WorkflowRun & { completedAt: Date } =>
      run.conclusion === 'success' && run.attempt === 1 && run.completedAt !== null,
    )
    .map((run) => run.completedAt.getTime() - run.startedAt.getTime())
    .filter((durationMs) => durationMs >= 0)
    .map((durationMs) => durationMs / MS_PER_SECOND);

  const value = median(samples);
  return value === null ? null : round2(value);
}

export function flakyTestRate(runs: WorkflowRun[]): number | null {
  const failures = runs.filter((run): run is WorkflowRun & { completedAt: Date } =>
    run.conclusion === 'failure' && run.completedAt !== null,
  );
  if (failures.length === 0) {
    return null;
  }

  const successes = runs.filter((run): run is WorkflowRun & { completedAt: Date } =>
    run.conclusion === 'success' && run.completedAt !== null,
  );

  const flakyFailures = failures.filter((failure) =>
    successes.some((success) => {
      if (success.workflowId !== failure.workflowId) {
        return false;
      }

      const elapsedMs = success.completedAt.getTime() - failure.completedAt.getTime();
      return elapsedMs >= 0 && elapsedMs <= MS_PER_HOUR;
    }),
  ).length;

  return round2(flakyFailures / failures.length);
}
