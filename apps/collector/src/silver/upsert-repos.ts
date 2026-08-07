import { dimOrg, dimRepo, type Database } from '@ghcp-dash/db';
import type { GithubRepo } from '@ghcp-dash/contracts';
import type { Scope } from '../github/scope.js';
import { withDimensionAdvisoryLock } from './common.js';

export async function upsertRepos(database: Database, scope: Scope, repos: readonly GithubRepo[]): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const orgId = scope.slug;
  // Ensure the org and all repo dimensions are written under a single advisory lock so
  // concurrent scope ingestion cannot deadlock and does not double-acquire the in-process gate.
  await withDimensionAdvisoryLock(database, async (lockedDatabase) => {
    await lockedDatabase
      .insert(dimOrg)
      .values({ orgId, displayName: orgId, firstSeenDay: today, lastSeenDay: today })
      .onConflictDoNothing({ target: dimOrg.orgId });
    for (const repo of [...repos].sort((a, b) => a.id - b.id)) {
      const values = {
        repoId: BigInt(repo.id),
        orgId,
        name: repo.name,
        defaultBranch: repo.default_branch,
        firstSeenDay: today,
        lastSeenDay: today,
      };
      await lockedDatabase.insert(dimRepo).values(values).onConflictDoUpdate({
        target: dimRepo.repoId,
        set: { orgId, name: repo.name, defaultBranch: repo.default_branch, lastSeenDay: today },
      });
    }
  });
  return repos.length;
}
