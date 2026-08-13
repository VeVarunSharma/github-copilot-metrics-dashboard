import { GithubReposResponseSchema, type GithubRepo } from '@ghcp-dash/contracts';
import { NoContentError, type GitHubClient } from './client.js';
import { scopeUrls, type Scope } from './scope.js';

function nextLink(headers: Headers): string | undefined {
  const link = headers.get('Link');
  if (!link) return undefined;
  for (const part of link.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

/** Enterprise repository enumeration uses different APIs and is not supported in Phase 1. */
export async function listRepos(client: GitHubClient, scope: Scope): Promise<GithubRepo[]> {
  if (scope.kind === 'enterprise') {
    console.warn(`Delivery repo enumeration is not yet supported for enterprise scope '${scope.slug}'; skipping delivery ingestion for this scope.`);
    return [];
  }

  const repos: GithubRepo[] = [];
  let url: string | undefined = scopeUrls.orgRepos(scope);
  while (url) {
    try {
      const response = await client.request(url);
      const parsed = GithubReposResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Failed to parse GitHub repos response', { cause: parsed.error });
      repos.push(...parsed.data.filter((repo) => !repo.archived && !repo.fork));
      url = nextLink(response.headers);
    } catch (error) {
      if (error instanceof NoContentError) return repos;
      throw error;
    }
  }
  return repos;
}
