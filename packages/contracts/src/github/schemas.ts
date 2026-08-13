import { z } from 'zod';

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const CountSchema = z.number().finite();

export const TokenUsageSchema = z.object({
  avg_tokens_per_request: CountSchema,
  output_tokens_sum: CountSchema,
  prompt_tokens_sum: CountSchema,
}).passthrough();
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

const ActivityMetricsSchema = z.object({
  code_acceptance_activity_count: CountSchema,
  code_generation_activity_count: CountSchema,
  loc_added_sum: CountSchema,
  loc_deleted_sum: CountSchema,
  loc_suggested_to_add_sum: CountSchema,
  loc_suggested_to_delete_sum: CountSchema,
});

const ActivityMetricsWithOptionalInteractionsSchema = ActivityMetricsSchema.extend({
  user_initiated_interaction_count: CountSchema.optional(),
});

export const TotalsByFeatureItemSchema = ActivityMetricsWithOptionalInteractionsSchema.extend({
  feature: z.string(),
}).passthrough();
export type TotalsByFeatureItem = z.infer<typeof TotalsByFeatureItemSchema>;

export const TotalsByIdeItemSchema = ActivityMetricsWithOptionalInteractionsSchema.extend({
  ide: z.string(),
  last_known_ide_version: z.unknown().optional(),
  last_known_plugin_version: z.unknown().optional(),
}).passthrough();
export type TotalsByIdeItem = z.infer<typeof TotalsByIdeItemSchema>;

export const TotalsByLanguageFeatureItemSchema = ActivityMetricsWithOptionalInteractionsSchema.extend({
  language: z.string(),
  feature: z.string(),
}).passthrough();
export type TotalsByLanguageFeatureItem = z.infer<typeof TotalsByLanguageFeatureItemSchema>;

export const TotalsByLanguageModelItemSchema = ActivityMetricsWithOptionalInteractionsSchema.extend({
  language: z.string(),
  model: z.string(),
}).passthrough();
export type TotalsByLanguageModelItem = z.infer<typeof TotalsByLanguageModelItemSchema>;

export const TotalsByModelFeatureItemSchema = ActivityMetricsWithOptionalInteractionsSchema.extend({
  model: z.string(),
  feature: z.string(),
}).passthrough();
export type TotalsByModelFeatureItem = z.infer<typeof TotalsByModelFeatureItemSchema>;

export const TotalsByCliItemSchema = z.object({
  last_known_cli_version: z.unknown().optional(),
  prompt_count: CountSchema,
  request_count: CountSchema,
  session_count: CountSchema,
  token_usage: TokenUsageSchema,
}).passthrough();
export type TotalsByCliItem = z.infer<typeof TotalsByCliItemSchema>;

export const PullRequestsSchema = z.object({
  median_minutes_to_merge: CountSchema.nullable().optional(),
  median_minutes_to_merge_copilot_authored: CountSchema.nullable().optional(),
  median_minutes_to_merge_copilot_reviewed: CountSchema.nullable().optional(),
  total_applied_suggestions: CountSchema,
  total_copilot_applied_suggestions: CountSchema,
  total_copilot_suggestions: CountSchema,
  total_created: CountSchema,
  total_created_by_copilot: CountSchema,
  total_merged: CountSchema,
  total_merged_created_by_copilot: CountSchema,
  total_merged_reviewed_by_copilot: CountSchema,
  total_reviewed: CountSchema,
  total_reviewed_by_copilot: CountSchema,
  total_suggestions: CountSchema,
}).passthrough();
export type PullRequests = z.infer<typeof PullRequestsSchema>;

const TopLevelActivitySchema = ActivityMetricsSchema.extend({
  user_initiated_interaction_count: CountSchema.optional(),
});

export const OrgDailyTotalSchema = TopLevelActivitySchema.extend({
  totals_by_cli: TotalsByCliItemSchema.optional(),
  totals_by_feature: z.array(TotalsByFeatureItemSchema).optional(),
  totals_by_ide: z.array(TotalsByIdeItemSchema).optional(),
  totals_by_language_feature: z.array(TotalsByLanguageFeatureItemSchema).optional(),
  totals_by_language_model: z.array(TotalsByLanguageModelItemSchema).optional(),
  totals_by_model_feature: z.array(TotalsByModelFeatureItemSchema).optional(),
  day: DateStringSchema,
  daily_active_users: CountSchema,
  weekly_active_users: CountSchema,
  monthly_active_users: CountSchema,
  monthly_active_chat_users: CountSchema.optional(),
  monthly_active_agent_users: CountSchema.optional(),
  daily_active_cli_users: CountSchema.optional(),
  pull_requests: PullRequestsSchema.optional(),
}).passthrough();
export type OrgDailyTotal = z.infer<typeof OrgDailyTotalSchema>;

export const OrgDailyReportSchema = z.object({
  day_totals: z.array(OrgDailyTotalSchema),
  enterprise_id: z.string().optional(),
  organization_id: z.string().optional(),
  report_start_day: DateStringSchema,
  report_end_day: DateStringSchema,
}).passthrough();
export type OrgDailyReport = z.infer<typeof OrgDailyReportSchema>;

export const UserDailyRowSchema = TopLevelActivitySchema.extend({
  totals_by_cli: TotalsByCliItemSchema.optional(),
  totals_by_feature: z.array(TotalsByFeatureItemSchema).optional(),
  totals_by_ide: z.array(TotalsByIdeItemSchema).optional(),
  totals_by_language_feature: z.array(TotalsByLanguageFeatureItemSchema).optional(),
  totals_by_language_model: z.array(TotalsByLanguageModelItemSchema).optional(),
  totals_by_model_feature: z.array(TotalsByModelFeatureItemSchema).optional(),
  user_id: z.number(),
  user_login: z.string(),
  day: DateStringSchema,
  organization_id: z.string().optional(),
  enterprise_id: z.string().optional(),
  used_chat: z.boolean().optional(),
  used_agent: z.boolean().optional(),
  used_cli: z.boolean().optional(),
}).passthrough();
export type UserDailyRow = z.infer<typeof UserDailyRowSchema>;

export const UserDailyRowsResponseSchema = z.array(UserDailyRowSchema);
export type UserDailyRowsResponse = z.infer<typeof UserDailyRowsResponseSchema>;

export const UserTeamRowSchema = z.object({
  user_id: z.number(),
  user_login: z.string(),
  day: DateStringSchema,
  organization_id: z.string().optional(),
  enterprise_id: z.string().optional(),
  team_id: z.number(),
  slug: z.string(),
}).passthrough();
export type UserTeamRow = z.infer<typeof UserTeamRowSchema>;

export const UserTeamRowsResponseSchema = z.array(UserTeamRowSchema);
export type UserTeamRowsResponse = z.infer<typeof UserTeamRowsResponseSchema>;

export const DownloadLinksResponseSchema = z.object({
  download_links: z.array(z.string().url()),
  report_day: DateStringSchema.optional(),
  report_start_day: DateStringSchema.optional(),
  report_end_day: DateStringSchema.optional(),
}).passthrough();
export type DownloadLinksResponse = z.infer<typeof DownloadLinksResponseSchema>;

export const BillingUsageItemSchema = z.object({
  date: z.string(),
  product: z.string(),
  sku: z.string(),
  quantity: CountSchema,
  unitType: z.string(),
  pricePerUnit: CountSchema,
  grossAmount: CountSchema,
  discountAmount: CountSchema,
  netAmount: CountSchema,
  organizationName: z.string().optional(),
  repositoryName: z.string().optional(),
  costCenterName: z.string().optional(),
  currency: z.string().optional(),
}).passthrough();
export type BillingUsageItem = z.infer<typeof BillingUsageItemSchema>;

export const BillingUsageSummarySchema = z.object({
  usageItems: z.array(BillingUsageItemSchema),
}).passthrough();
export type BillingUsageSummary = z.infer<typeof BillingUsageSummarySchema>;

export const AiCreditsUsageItemSchema = z.object({
  date: z.string(),
  model: z.string(),
  feature: z.string(),
  includedQuantity: CountSchema.optional(),
  billedQuantity: CountSchema.optional(),
  billedAmount: CountSchema.optional(),
  currency: z.string().optional(),
}).passthrough();
export type AiCreditsUsageItem = z.infer<typeof AiCreditsUsageItemSchema>;

export const AiCreditsUsageSchema = z.object({
  usageItems: z.array(AiCreditsUsageItemSchema),
}).passthrough();
export type AiCreditsUsage = z.infer<typeof AiCreditsUsageSchema>;

export const GithubReleaseSchema = z.object({
  id: z.number(),
  tag_name: z.string(),
  name: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  created_at: z.string(),
  published_at: z.string().nullable(),
  html_url: z.string(),
}).passthrough();
export type GithubRelease = z.infer<typeof GithubReleaseSchema>;

export const GithubReleasesResponseSchema = z.array(GithubReleaseSchema);
export type GithubReleasesResponse = z.infer<typeof GithubReleasesResponseSchema>;

export const GithubWorkflowRunSchema = z.object({
  id: z.number(),
  workflow_id: z.number(),
  status: z.string(),
  conclusion: z.string().nullable(),
  run_attempt: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  run_started_at: z.string().nullable(),
}).passthrough();
export type GithubWorkflowRun = z.infer<typeof GithubWorkflowRunSchema>;

export const GithubWorkflowRunsResponseSchema = z.object({
  total_count: z.number(),
  workflow_runs: z.array(GithubWorkflowRunSchema),
}).passthrough();
export type GithubWorkflowRunsResponse = z.infer<typeof GithubWorkflowRunsResponseSchema>;

const GithubCommitActorSchema = z.object({
  name: z.string(),
  email: z.string(),
  date: z.string(),
}).passthrough();

// The list commits endpoint omits stats; fetch per-commit details or stats aggregates when additions/deletions are required.
export const GithubCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    author: GithubCommitActorSchema,
    committer: GithubCommitActorSchema,
    message: z.string(),
  }).passthrough(),
  author: z.object({ id: z.number(), login: z.string() }).passthrough().nullable(),
  stats: z.object({ additions: z.number(), deletions: z.number(), total: z.number() }).passthrough().optional(),
}).passthrough();
export type GithubCommit = z.infer<typeof GithubCommitSchema>;

export const GithubCommitsResponseSchema = z.array(GithubCommitSchema);
export type GithubCommitsResponse = z.infer<typeof GithubCommitsResponseSchema>;

export const GithubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  archived: z.boolean(),
  fork: z.boolean(),
  private: z.boolean(),
  pushed_at: z.string(),
}).passthrough();
export type GithubRepo = z.infer<typeof GithubRepoSchema>;

export const GithubReposResponseSchema = z.array(GithubRepoSchema);
export type GithubReposResponse = z.infer<typeof GithubReposResponseSchema>;

