import type { Database } from '@ghcp-dash/db';
import type { GitHubClient } from '../github/client.js';
import type { Logger } from '../logger.js';
import type { GithubRepo } from '@ghcp-dash/contracts';

export interface IngestContext {
  client: GitHubClient;
  database: Database;
  bronzeDir: string;
  dryRun: boolean;
  logger: Logger;
  deliveryRepos?: Map<string, GithubRepo[]>;
}

export interface IngestResult {
  source: string;
  orgId: string;
  day: string | null;
  rowsWritten: number;
  status: 'success' | 'no_content';
  bronzePath?: string;
}
