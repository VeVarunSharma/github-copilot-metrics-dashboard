import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  bridgeUserTeam,
  dimRepo,
  dimTeam,
  dimUser,
  factCiDaily,
  factCommitDaily,
  factDoraDaily,
  factOrgDaily,
  factOrgDailyByFeature,
  factReleaseDaily,
  factRoiDaily,
  factTeamValueDaily,
  factUserDaily,
  factValueDaily,
  factUserDailyByLanguageModel,
  factUserDailyByModelFeature,
  factWorkflowRunDaily,
  settings,
} from '../schema/index.js';

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

function primaryKeyColumns(table: Parameters<typeof getTableConfig>[0]): string[] {
  const config = getTableConfig(table);
  const tableLevel = config.primaryKeys[0]?.columns.map((column) => column.name) ?? [];
  if (tableLevel.length > 0) return tableLevel;
  return config.columns.filter((column) => column.primary).map((column) => column.name);
}

function indexNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table)
    .indexes.map((index) => index.config.name)
    .filter((name): name is string => name !== undefined);
}

function foreignKeyNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).foreignKeys.map((foreignKey) => foreignKey.getName());
}

describe('Drizzle schema', () => {
  it('defines indexed user identity columns', () => {
    expect(columnNames(dimUser)).toEqual(
      expect.arrayContaining(['user_id', 'user_login', 'pseudonym', 'first_seen_day', 'last_seen_day']),
    );
    expect(indexNames(dimUser)).toEqual(expect.arrayContaining(['dim_user_user_login_idx', 'dim_user_pseudonym_idx']));
  });

  it('defines the team org/slug unique constraint', () => {
    const uniqueConstraints = getTableConfig(dimTeam).uniqueConstraints.map((constraint) => constraint.name);
    expect(uniqueConstraints).toContain('dim_team_org_id_slug_unique');
  });

  it('defines fact_org_daily columns and composite primary key', () => {
    expect(primaryKeyColumns(factOrgDaily)).toEqual(['org_id', 'day']);
    expect(columnNames(factOrgDaily)).toEqual(
      expect.arrayContaining([
        'monthly_active_agent_users',
        'pr_total_copilot_applied_suggestions',
        'pr_median_minutes_to_merge_copilot_reviewed',
        'cli_output_tokens_sum',
        'ingested_at',
      ]),
    );
    expect(indexNames(factOrgDaily)).toEqual(
      expect.arrayContaining(['fact_org_daily_day_desc_idx', 'fact_org_daily_org_id_day_desc_idx']),
    );
  });

  it('defines org breakdown composite primary keys and activity columns', () => {
    expect(primaryKeyColumns(factOrgDailyByFeature)).toEqual(['org_id', 'day', 'feature']);
    expect(columnNames(factOrgDailyByFeature)).toEqual(
      expect.arrayContaining([
        'code_acceptance_activity_count',
        'code_generation_activity_count',
        'loc_added_sum',
        'loc_deleted_sum',
        'loc_suggested_to_add_sum',
        'loc_suggested_to_delete_sum',
        'user_initiated_interaction_count',
      ]),
    );
  });

  it('defines user fact and bridge composite primary keys', () => {
    expect(primaryKeyColumns(factUserDaily)).toEqual(['user_id', 'org_id', 'day']);
    expect(columnNames(factUserDaily)).toEqual(expect.arrayContaining(['used_chat', 'used_agent', 'used_cli']));
    expect(primaryKeyColumns(bridgeUserTeam)).toEqual(['user_id', 'team_id', 'day']);
  });

  it('defines user model breakdown fact composite primary keys', () => {
    expect(primaryKeyColumns(factUserDailyByLanguageModel)).toEqual(['user_id', 'org_id', 'day', 'language', 'model']);
    expect(columnNames(factUserDailyByLanguageModel)).toEqual(
      expect.arrayContaining([
        'code_acceptance_activity_count',
        'code_generation_activity_count',
        'loc_added_sum',
        'loc_deleted_sum',
        'user_initiated_interaction_count',
      ]),
    );
    expect(indexNames(factUserDailyByLanguageModel)).toContain('fact_user_daily_by_language_model_user_id_day_desc_idx');

    expect(primaryKeyColumns(factUserDailyByModelFeature)).toEqual(['user_id', 'org_id', 'day', 'model', 'feature']);
    expect(columnNames(factUserDailyByModelFeature)).toEqual(
      expect.arrayContaining([
        'code_acceptance_activity_count',
        'code_generation_activity_count',
        'loc_added_sum',
        'loc_deleted_sum',
        'user_initiated_interaction_count',
      ]),
    );
    expect(indexNames(factUserDailyByModelFeature)).toContain('fact_user_daily_by_model_feature_user_id_day_desc_idx');
  });

  it('defines gold fact composite primary keys and knob snapshots', () => {
    expect(primaryKeyColumns(factValueDaily)).toEqual(['org_id', 'day', 'estimator']);
    expect(columnNames(factValueDaily)).toContain('knob_snapshot');
    expect(primaryKeyColumns(factRoiDaily)).toEqual(['org_id', 'day']);
    expect(primaryKeyColumns(factTeamValueDaily)).toEqual(['team_id', 'day', 'estimator']);
  });

  it('defines settings as a jsonb key/value table', () => {
    expect(primaryKeyColumns(settings)).toEqual(['key']);
    expect(columnNames(settings)).toEqual(['key', 'value', 'updated_at']);
  });

  it('defines delivery repository dimension primary key, org foreign key, and lookup index', () => {
    expect(primaryKeyColumns(dimRepo)).toEqual(['repo_id']);
    expect(columnNames(dimRepo)).toEqual(
      expect.arrayContaining(['repo_id', 'org_id', 'name', 'default_branch', 'first_seen_day', 'last_seen_day']),
    );
    expect(foreignKeyNames(dimRepo)).toContain('dim_repo_org_id_dim_org_org_id_fk');
    expect(indexNames(dimRepo)).toContain('dim_repo_org_id_name_idx');
  });

  it('defines silver delivery fact primary keys and foreign keys', () => {
    expect(primaryKeyColumns(factReleaseDaily)).toEqual(['org_id', 'repo_id', 'day']);
    expect(columnNames(factReleaseDaily)).toEqual(
      expect.arrayContaining(['release_count', 'prerelease_count', 'latest_tag_at']),
    );
    expect(foreignKeyNames(factReleaseDaily)).toEqual(
      expect.arrayContaining([
        'fact_release_daily_org_id_dim_org_org_id_fk',
        'fact_release_daily_repo_id_dim_repo_repo_id_fk',
      ]),
    );

    expect(primaryKeyColumns(factWorkflowRunDaily)).toEqual(['org_id', 'repo_id', 'workflow_id', 'day']);
    expect(columnNames(factWorkflowRunDaily)).toEqual(
      expect.arrayContaining([
        'success_count',
        'failure_count',
        'cancelled_count',
        'median_duration_sec',
        'p90_duration_sec',
      ]),
    );
    expect(foreignKeyNames(factWorkflowRunDaily)).toEqual(
      expect.arrayContaining([
        'fact_workflow_run_daily_org_id_dim_org_org_id_fk',
        'fact_workflow_run_daily_repo_id_dim_repo_repo_id_fk',
      ]),
    );

    expect(primaryKeyColumns(factCommitDaily)).toEqual(['org_id', 'repo_id', 'author_user_id', 'day']);
    expect(columnNames(factCommitDaily)).toEqual(
      expect.arrayContaining(['commit_count', 'additions_sum', 'deletions_sum']),
    );
    expect(foreignKeyNames(factCommitDaily)).toEqual(
      expect.arrayContaining([
        'fact_commit_daily_org_id_dim_org_org_id_fk',
        'fact_commit_daily_repo_id_dim_repo_repo_id_fk',
      ]),
    );
  });

  it('defines gold delivery fact primary keys and org foreign keys', () => {
    expect(primaryKeyColumns(factDoraDaily)).toEqual(['org_id', 'day']);
    expect(columnNames(factDoraDaily)).toEqual(
      expect.arrayContaining(['deployment_frequency', 'lead_time_min', 'change_failure_rate', 'mttr_min']),
    );
    expect(foreignKeyNames(factDoraDaily)).toContain('fact_dora_daily_org_id_dim_org_org_id_fk');

    expect(primaryKeyColumns(factCiDaily)).toEqual(['org_id', 'day']);
    expect(columnNames(factCiDaily)).toEqual(
      expect.arrayContaining(['ci_success_rate', 'median_time_to_green_sec', 'flaky_test_rate']),
    );
    expect(foreignKeyNames(factCiDaily)).toContain('fact_ci_daily_org_id_dim_org_org_id_fk');
  });
});
