CREATE TABLE IF NOT EXISTS "dim_repo" (
  "repo_id" bigint PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "name" text NOT NULL,
  "default_branch" text NOT NULL,
  "first_seen_day" date NOT NULL,
  "last_seen_day" date NOT NULL,
  CONSTRAINT "dim_repo_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_release_daily" (
  "org_id" text NOT NULL,
  "repo_id" bigint NOT NULL,
  "day" date NOT NULL,
  "release_count" integer NOT NULL,
  "prerelease_count" integer NOT NULL,
  "latest_tag_at" timestamptz,
  CONSTRAINT "fact_release_daily_org_id_repo_id_day_pk" PRIMARY KEY("org_id","repo_id","day"),
  CONSTRAINT "fact_release_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_release_daily_repo_id_dim_repo_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."dim_repo"("repo_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_workflow_run_daily" (
  "org_id" text NOT NULL,
  "repo_id" bigint NOT NULL,
  "workflow_id" bigint NOT NULL,
  "day" date NOT NULL,
  "success_count" integer NOT NULL,
  "failure_count" integer NOT NULL,
  "cancelled_count" integer NOT NULL,
  "median_duration_sec" numeric NOT NULL,
  "p90_duration_sec" numeric NOT NULL,
  CONSTRAINT "fact_workflow_run_daily_org_id_repo_id_workflow_id_day_pk" PRIMARY KEY("org_id","repo_id","workflow_id","day"),
  CONSTRAINT "fact_workflow_run_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_workflow_run_daily_repo_id_dim_repo_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."dim_repo"("repo_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_commit_daily" (
  "org_id" text NOT NULL,
  "repo_id" bigint NOT NULL,
  "author_user_id" bigint NOT NULL,
  "day" date NOT NULL,
  "commit_count" integer NOT NULL,
  "additions_sum" bigint NOT NULL,
  "deletions_sum" bigint NOT NULL,
  CONSTRAINT "fact_commit_daily_org_id_repo_id_author_user_id_day_pk" PRIMARY KEY("org_id","repo_id","author_user_id","day"),
  CONSTRAINT "fact_commit_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_commit_daily_repo_id_dim_repo_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."dim_repo"("repo_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_dora_daily" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "deployment_frequency" numeric,
  "lead_time_min" numeric,
  "change_failure_rate" numeric,
  "mttr_min" numeric,
  CONSTRAINT "fact_dora_daily_org_id_day_pk" PRIMARY KEY("org_id","day"),
  CONSTRAINT "fact_dora_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_ci_daily" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "ci_success_rate" numeric,
  "median_time_to_green_sec" numeric,
  "flaky_test_rate" numeric,
  CONSTRAINT "fact_ci_daily_org_id_day_pk" PRIMARY KEY("org_id","day"),
  CONSTRAINT "fact_ci_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dim_repo_org_id_name_idx" ON "dim_repo" USING btree ("org_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_release_daily_org_id_day_idx" ON "fact_release_daily" USING btree ("org_id","day");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_workflow_run_daily_org_id_day_idx" ON "fact_workflow_run_daily" USING btree ("org_id","day");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_commit_daily_org_id_day_idx" ON "fact_commit_daily" USING btree ("org_id","day");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_dora_daily_org_id_day_idx" ON "fact_dora_daily" USING btree ("org_id","day");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_ci_daily_org_id_day_idx" ON "fact_ci_daily" USING btree ("org_id","day");
