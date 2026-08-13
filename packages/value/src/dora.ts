import { round2 } from './estimators.js';

export interface ReleaseEvent {
  day: string;
  isPrerelease: boolean;
  tagAt: Date | null;
}

export interface CommitEvent {
  day: string;
  sha?: string;
  authoredAt: Date;
}

export interface IncidentEvent {
  openedAt: Date;
  closedAt: Date | null;
}

export interface RevertEvent {
  releasedAt: Date;
  revertedAt: Date;
}

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function productionReleases(releases: ReleaseEvent[]): ReleaseEvent[] {
  return releases.filter((release) => !release.isPrerelease && release.tagAt !== null);
}

export function deploymentFrequency(releases: ReleaseEvent[], daysInWindow: number): number | null {
  if (daysInWindow <= 0) {
    return null;
  }

  const deployments = productionReleases(releases).length;
  if (deployments === 0) {
    return null;
  }

  return round2(deployments / daysInWindow);
}

export function leadTimeForChanges(commits: CommitEvent[], releases: ReleaseEvent[]): number | null {
  const deployments = productionReleases(releases);
  if (commits.length === 0 || deployments.length === 0) {
    return null;
  }

  const samples = deployments.flatMap((release) => {
    const tagAt = release.tagAt;
    if (tagAt === null) {
      return [];
    }

    return commits
      .filter((commit) => commit.day === release.day)
      .map((commit) => tagAt.getTime() - commit.authoredAt.getTime())
      .filter((durationMs) => durationMs >= 0)
      .map((durationMs) => durationMs / MS_PER_MINUTE);
  });

  const value = median(samples);
  return value === null ? null : round2(value);
}

export function changeFailureRate(
  releases: ReleaseEvent[],
  reverts: RevertEvent[],
  hotfixWindowHours = 48,
): number | null {
  if (hotfixWindowHours < 0) {
    return null;
  }

  const deployments = productionReleases(releases);
  if (deployments.length === 0) {
    return null;
  }

  const windowMinutes = hotfixWindowHours * MINUTES_PER_HOUR;
  const failedDeployments = deployments.filter((release) => {
    const tagAt = release.tagAt;
    if (tagAt === null) {
      return false;
    }

    return reverts.some((revert) => {
      if (revert.releasedAt.getTime() !== tagAt.getTime()) {
        return false;
      }

      const minutesAfterRelease = (revert.revertedAt.getTime() - revert.releasedAt.getTime()) / MS_PER_MINUTE;
      return minutesAfterRelease >= 0 && minutesAfterRelease <= windowMinutes;
    });
  }).length;

  return round2(failedDeployments / deployments.length);
}

export function meanTimeToRestore(incidents: IncidentEvent[]): number | null {
  const samples = incidents
    .filter((incident): incident is { openedAt: Date; closedAt: Date } => incident.closedAt !== null)
    .map((incident) => incident.closedAt.getTime() - incident.openedAt.getTime())
    .filter((durationMs) => durationMs >= 0)
    .map((durationMs) => durationMs / MS_PER_MINUTE);

  const value = median(samples);
  return value === null ? null : round2(value);
}
