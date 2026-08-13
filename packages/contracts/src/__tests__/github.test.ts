import { describe, expect, it } from 'vitest';
import {
  AiCreditsUsageSchema,
  BillingUsageSummarySchema,
  DownloadLinksResponseSchema,
  GithubCommitsResponseSchema,
  GithubReleasesResponseSchema,
  GithubReposResponseSchema,
  GithubWorkflowRunsResponseSchema,
  OrgDailyReportSchema,
  UserDailyRowsResponseSchema,
  UserTeamRowsResponseSchema,
} from '../github/index.js';

const activity = {
  code_acceptance_activity_count: 2,
  code_generation_activity_count: 4,
  loc_added_sum: 120,
  loc_deleted_sum: 30,
  loc_suggested_to_add_sum: 160,
  loc_suggested_to_delete_sum: 40,
};

const nestedTotals = {
  totals_by_cli: {
    last_known_cli_version: { cli_version: '1.2.3', sampled_at: '2025-10-01T00:00:00Z' },
    prompt_count: 3,
    request_count: 4,
    session_count: 2,
    token_usage: {
      avg_tokens_per_request: 100,
      output_tokens_sum: 250,
      prompt_tokens_sum: 150,
    },
  },
  totals_by_feature: [{ feature: 'code_completion', ...activity, user_initiated_interaction_count: 1 }],
  totals_by_ide: [
    {
      ide: 'vscode',
      last_known_ide_version: { ide_version: '1.99.0', sampled_at: '2025-10-01T00:00:00Z' },
      last_known_plugin_version: { plugin_version: '1.200.0', sampled_at: '2025-10-01T00:00:00Z' },
      ...activity,
    },
  ],
  totals_by_language_feature: [{ language: 'typescript', feature: 'chat', ...activity }],
  totals_by_language_model: [{ language: 'typescript', model: 'gpt-4o', ...activity }],
  totals_by_model_feature: [{ model: 'gpt-4o', feature: 'agent', ...activity }],
};

const pullRequests = {
  median_minutes_to_merge: 120,
  median_minutes_to_merge_copilot_authored: 90,
  total_applied_suggestions: 5,
  total_copilot_applied_suggestions: 3,
  total_copilot_suggestions: 4,
  total_created: 10,
  total_created_by_copilot: 2,
  total_merged: 8,
  total_merged_created_by_copilot: 2,
  total_merged_reviewed_by_copilot: 3,
  total_reviewed: 7,
  total_reviewed_by_copilot: 3,
  total_suggestions: 9,
};

describe('GitHub inbound schemas', () => {
  it('parses the org daily report shape from spec 01 section 6', () => {
    const payload = {
      day_totals: [
        {
          day: '2025-10-01',
          daily_active_users: 12,
          weekly_active_users: 30,
          monthly_active_users: 45,
          monthly_active_chat_users: 25,
          monthly_active_agent_users: 9,
          daily_active_cli_users: 4,
          ...activity,
          user_initiated_interaction_count: 11,
          pull_requests: pullRequests,
          ...nestedTotals,
        },
      ],
      enterprise_id: '1',
      organization_id: '99',
      report_start_day: '2025-09-04',
      report_end_day: '2025-10-01',
      etl_id: 'green',
    };

    expect(OrgDailyReportSchema.parse(payload).day_totals).toHaveLength(1);
  });

  it('allows optional PR median fields to be absent', () => {
    const parsed = OrgDailyReportSchema.parse({
      day_totals: [
        {
          day: '2025-10-01',
          daily_active_users: 0,
          weekly_active_users: 0,
          monthly_active_users: 0,
          monthly_active_chat_users: 0,
          monthly_active_agent_users: 0,
          daily_active_cli_users: 0,
          ...activity,
          user_initiated_interaction_count: 0,
          pull_requests: {
            ...pullRequests,
            median_minutes_to_merge: undefined,
            median_minutes_to_merge_copilot_authored: undefined,
          },
          ...nestedTotals,
        },
      ],
      report_start_day: '2025-10-01',
      report_end_day: '2025-10-01',
    });

    expect(parsed.day_totals[0]?.pull_requests?.total_created).toBe(10);
  });

  it('parses user daily and user team arrays', () => {
    expect(
      UserDailyRowsResponseSchema.parse([
        {
          user_id: 123,
          user_login: 'octocat',
          day: '2025-10-01',
          organization_id: '99',
          used_chat: true,
          used_agent: false,
          used_cli: true,
          ...activity,
          user_initiated_interaction_count: 6,
          ...nestedTotals,
        },
      ]),
    ).toHaveLength(1);

    expect(
      UserTeamRowsResponseSchema.parse([
        { user_id: 123, user_login: 'octocat', day: '2025-10-01', team_id: 456, slug: 'platform' },
      ]),
    ).toHaveLength(1);
  });

  it('parses download-link, billing, and AI credits wrapper payloads', () => {
    expect(
      DownloadLinksResponseSchema.parse({
        download_links: ['https://example.com/report.ndjson'],
        report_day: '2026-06-18',
      }).download_links,
    ).toHaveLength(1);

    expect(
      BillingUsageSummarySchema.parse({
        usageItems: [
          {
            date: '2026-06-18',
            product: 'GitHub Copilot',
            sku: 'Copilot Business',
            quantity: 10,
            unitType: 'Seats',
            pricePerUnit: 39,
            grossAmount: 390,
            discountAmount: 0,
            netAmount: 390,
            currency: 'USD',
          },
        ],
      }).usageItems,
    ).toHaveLength(1);

    expect(
      AiCreditsUsageSchema.parse({
        usageItems: [
          {
            date: '2026-06-18',
            model: 'gpt-4o',
            feature: 'chat',
            includedQuantity: 100,
            billedQuantity: 5,
            billedAmount: 1.25,
            currency: 'USD',
            futureField: 'kept',
          },
        ],
      }).usageItems,
    ).toHaveLength(1);
  });

  it('parses GitHub releases response payloads', () => {
    const parsed = GithubReleasesResponseSchema.parse([
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'v1.0.0',
        draft: false,
        prerelease: false,
        created_at: '2026-06-18T12:00:00Z',
        published_at: '2026-06-18T12:30:00Z',
        html_url: 'https://github.com/octo-org/octo-repo/releases/tag/v1.0.0',
        assets: [],
      },
      {
        id: 2,
        tag_name: 'v1.1.0-beta',
        name: null,
        draft: true,
        prerelease: true,
        created_at: '2026-06-19T12:00:00Z',
        published_at: null,
        html_url: 'https://github.com/octo-org/octo-repo/releases/tag/v1.1.0-beta',
      },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[1]?.published_at).toBeNull();
  });

  it('parses GitHub workflow runs response payloads', () => {
    const parsed = GithubWorkflowRunsResponseSchema.parse({
      total_count: 1,
      workflow_runs: [
        {
          id: 123,
          workflow_id: 456,
          status: 'completed',
          conclusion: 'success',
          run_attempt: 1,
          created_at: '2026-06-18T12:00:00Z',
          updated_at: '2026-06-18T12:05:00Z',
          run_started_at: '2026-06-18T12:01:00Z',
          name: 'CI',
        },
      ],
    });

    expect(parsed.workflow_runs[0]?.conclusion).toBe('success');
  });

  it('parses GitHub commits response payloads with optional stats', () => {
    const parsed = GithubCommitsResponseSchema.parse([
      {
        sha: 'abc123',
        commit: {
          author: { name: 'Octo Cat', email: 'octo@example.com', date: '2026-06-18T12:00:00Z' },
          committer: { name: 'GitHub', email: 'noreply@github.com', date: '2026-06-18T12:01:00Z' },
          message: 'Add delivery contracts',
        },
        author: { id: 1, login: 'octocat', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
      },
      {
        sha: 'def456',
        commit: {
          author: { name: 'Unmatched Author', email: 'unmatched@example.com', date: '2026-06-18T13:00:00Z' },
          committer: { name: 'GitHub', email: 'noreply@github.com', date: '2026-06-18T13:01:00Z' },
          message: 'Include commit stats when fetched from commit detail',
        },
        author: null,
        stats: { additions: 10, deletions: 2, total: 12 },
      },
    ]);

    expect(parsed[0]?.stats).toBeUndefined();
    expect(parsed[1]?.author).toBeNull();
  });

  it('parses GitHub repos response payloads', () => {
    const parsed = GithubReposResponseSchema.parse([
      {
        id: 42,
        name: 'octo-repo',
        full_name: 'octo-org/octo-repo',
        default_branch: 'main',
        archived: false,
        fork: false,
        private: true,
        pushed_at: '2026-06-18T12:00:00Z',
        visibility: 'private',
      },
    ]);

    expect(parsed[0]?.full_name).toBe('octo-org/octo-repo');
  });

  it('rejects malformed inbound payloads', () => {
    expect(() => OrgDailyReportSchema.parse({ day_totals: [], report_start_day: '2025/10/01' })).toThrow();
    expect(() => UserDailyRowsResponseSchema.parse([{ user_id: 'not-a-number' }])).toThrow();
    expect(() => DownloadLinksResponseSchema.parse({ download_links: ['not a url'] })).toThrow();
  });
});
