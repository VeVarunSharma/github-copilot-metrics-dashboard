import { describe, expect, it } from 'vitest';
import {
  changeFailureRate,
  deploymentFrequency,
  leadTimeForChanges,
  meanTimeToRestore,
} from '../index.js';
import type { CommitEvent, IncidentEvent, ReleaseEvent, RevertEvent } from '../index.js';

const at = (iso: string): Date => new Date(iso);

function release(day: string, iso: string | null, isPrerelease = false): ReleaseEvent {
  return { day, isPrerelease, tagAt: iso === null ? null : at(iso) };
}

describe('DORA value-engine metrics', () => {
  it('returns null deployment frequency when there are no production releases', () => {
    expect(deploymentFrequency([], 7)).toBeNull();
    expect(deploymentFrequency([release('2026-06-01', '2026-06-01T12:00:00Z', true)], 7)).toBeNull();
  });

  it('returns null deployment frequency when the day window is not positive', () => {
    expect(deploymentFrequency([release('2026-06-01', '2026-06-01T12:00:00Z')], 0)).toBeNull();
  });

  it('counts only tagged production releases for deployment frequency', () => {
    const releases: ReleaseEvent[] = [
      release('2026-06-01', '2026-06-01T12:00:00Z'),
      release('2026-06-02', '2026-06-02T12:00:00Z', true),
      release('2026-06-03', null),
      release('2026-06-04', '2026-06-04T12:00:00Z'),
    ];

    expect(deploymentFrequency(releases, 10)).toBe(0.2);
  });

  it('is monotonic as production releases increase in the same window', () => {
    const oneRelease = [release('2026-06-01', '2026-06-01T12:00:00Z')];
    const twoReleases = [...oneRelease, release('2026-06-02', '2026-06-02T12:00:00Z')];

    expect(deploymentFrequency(twoReleases, 10)).toBe(2 * deploymentFrequency(oneRelease, 10)!);
  });

  it('returns null lead time when there is no same-day commit and release overlap', () => {
    const commits: CommitEvent[] = [{ day: '2026-06-01', authoredAt: at('2026-06-01T10:00:00Z') }];
    const releases = [release('2026-06-02', '2026-06-02T12:00:00Z')];

    expect(leadTimeForChanges(commits, releases)).toBeNull();
  });

  it('computes median lead time in minutes from same-day commits to production release tag', () => {
    const commits: CommitEvent[] = [
      { day: '2026-06-01', sha: 'a', authoredAt: at('2026-06-01T10:00:00Z') },
      { day: '2026-06-01', sha: 'b', authoredAt: at('2026-06-01T11:00:00Z') },
      { day: '2026-06-02', sha: 'c', authoredAt: at('2026-06-02T11:00:00Z') },
    ];

    expect(leadTimeForChanges(commits, [release('2026-06-01', '2026-06-01T12:00:00Z')])).toBe(90);
  });

  it('ignores prerelease, untagged, and negative lead-time samples', () => {
    const commits: CommitEvent[] = [
      { day: '2026-06-01', authoredAt: at('2026-06-01T11:00:00Z') },
      { day: '2026-06-02', authoredAt: at('2026-06-02T11:00:00Z') },
      { day: '2026-06-03', authoredAt: at('2026-06-03T13:00:00Z') },
    ];
    const releases = [
      release('2026-06-01', '2026-06-01T12:00:00Z'),
      release('2026-06-02', '2026-06-02T12:00:00Z', true),
      release('2026-06-03', '2026-06-03T12:00:00Z'),
      release('2026-06-04', null),
    ];

    expect(leadTimeForChanges(commits, releases)).toBe(60);
  });

  it('returns null change failure rate when there are no production releases', () => {
    expect(changeFailureRate([], [])).toBeNull();
  });

  it('returns zero change failure rate when production releases have no matching reverts', () => {
    expect(changeFailureRate([release('2026-06-01', '2026-06-01T12:00:00Z')], [])).toBe(0);
  });

  it('counts hotfix reverts at the default 48-hour boundary inclusively', () => {
    const releases = [
      release('2026-06-01', '2026-06-01T12:00:00Z'),
      release('2026-06-03', '2026-06-03T12:00:00Z'),
    ];
    const reverts: RevertEvent[] = [
      { releasedAt: at('2026-06-01T12:00:00Z'), revertedAt: at('2026-06-03T12:00:00Z') },
      { releasedAt: at('2026-06-03T12:00:00Z'), revertedAt: at('2026-06-05T12:00:01Z') },
    ];

    expect(changeFailureRate(releases, reverts)).toBe(0.5);
  });

  it('honors a custom hotfix window for change failure rate', () => {
    const releases = [release('2026-06-01', '2026-06-01T12:00:00Z')];
    const reverts: RevertEvent[] = [
      { releasedAt: at('2026-06-01T12:00:00Z'), revertedAt: at('2026-06-01T18:00:00Z') },
    ];

    expect(changeFailureRate(releases, reverts, 4)).toBe(0);
    expect(changeFailureRate(releases, reverts, 6)).toBe(1);
  });

  it('computes MTTR median minutes from closed incidents and ignores open incidents', () => {
    const incidents: IncidentEvent[] = [
      { openedAt: at('2026-06-01T10:00:00Z'), closedAt: at('2026-06-01T11:00:00Z') },
      { openedAt: at('2026-06-02T10:00:00Z'), closedAt: null },
      { openedAt: at('2026-06-03T10:00:00Z'), closedAt: at('2026-06-03T14:00:00Z') },
    ];

    expect(meanTimeToRestore(incidents)).toBe(150);
  });

  it('returns null MTTR when there are no closed incidents', () => {
    expect(meanTimeToRestore([{ openedAt: at('2026-06-01T10:00:00Z'), closedAt: null }])).toBeNull();
  });
});
