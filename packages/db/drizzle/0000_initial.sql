CREATE TABLE "dim_org" (
  "org_id" text PRIMARY KEY NOT NULL,
  "display_name" text,
  "first_seen_day" date,
  "last_seen_day" date
);
--> statement-breakpoint
CREATE TABLE "dim_user" (
  "user_id" bigint PRIMARY KEY NOT NULL,
  "user_login" text,
  "pseudonym" text,
  "first_seen_day" date,
  "last_seen_day" date
);
--> statement-breakpoint
CREATE TABLE "dim_team" (
  "team_id" bigint PRIMARY KEY NOT NULL,
  "org_id" text,
  "slug" text,
  "first_seen_day" date,
  "last_seen_day" date,
  CONSTRAINT "dim_team_org_id_slug_unique" UNIQUE("org_id","slug")
);
--> statement-breakpoint
CREATE TABLE "dim_feature" (
  "name" text PRIMARY KEY NOT NULL,
  "display_name" text
);
--> statement-breakpoint
CREATE TABLE "dim_ide" (
  "name" text PRIMARY KEY NOT NULL,
  "display_name" text
);
--> statement-breakpoint
CREATE TABLE "dim_language" (
  "name" text PRIMARY KEY NOT NULL,
  "display_name" text
);
--> statement-breakpoint
CREATE TABLE "dim_model" (
  "name" text PRIMARY KEY NOT NULL,
  "display_name" text
);
--> statement-breakpoint
CREATE TABLE "fact_org_daily" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "daily_active_users" integer NOT NULL,
  "weekly_active_users" integer NOT NULL,
  "monthly_active_users" integer NOT NULL,
  "monthly_active_chat_users" integer NOT NULL,
  "monthly_active_agent_users" integer NOT NULL,
  "daily_active_cli_users" integer NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  "pr_total_created" integer NOT NULL,
  "pr_total_created_by_copilot" integer NOT NULL,
  "pr_total_merged" integer NOT NULL,
  "pr_total_merged_created_by_copilot" integer NOT NULL,
  "pr_total_reviewed" integer NOT NULL,
  "pr_total_reviewed_by_copilot" integer NOT NULL,
  "pr_total_suggestions" integer NOT NULL,
  "pr_total_applied_suggestions" integer NOT NULL,
  "pr_total_copilot_suggestions" integer NOT NULL,
  "pr_total_copilot_applied_suggestions" integer NOT NULL,
  "pr_median_minutes_to_merge" numeric,
  "pr_median_minutes_to_merge_copilot_authored" numeric,
  "pr_median_minutes_to_merge_copilot_reviewed" numeric,
  "cli_prompt_count" integer NOT NULL,
  "cli_request_count" integer NOT NULL,
  "cli_session_count" integer NOT NULL,
  "cli_prompt_tokens_sum" bigint NOT NULL,
  "cli_output_tokens_sum" bigint NOT NULL,
  "ingested_at" timestamptz NOT NULL,
  CONSTRAINT "fact_org_daily_org_id_day_pk" PRIMARY KEY("org_id","day")
);
--> statement-breakpoint
CREATE TABLE "fact_org_daily_by_feature" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "feature" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_org_daily_by_feature_org_id_day_feature_pk" PRIMARY KEY("org_id","day","feature")
);
--> statement-breakpoint
CREATE TABLE "fact_org_daily_by_ide" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "ide" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_org_daily_by_ide_org_id_day_ide_pk" PRIMARY KEY("org_id","day","ide")
);
--> statement-breakpoint
CREATE TABLE "fact_org_daily_by_language_feature" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "language" text NOT NULL,
  "feature" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_org_daily_by_language_feature_org_id_day_language_feature_pk" PRIMARY KEY("org_id","day","language","feature")
);
--> statement-breakpoint
CREATE TABLE "fact_org_daily_by_language_model" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "language" text NOT NULL,
  "model" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_org_daily_by_language_model_org_id_day_language_model_pk" PRIMARY KEY("org_id","day","language","model")
);
--> statement-breakpoint
CREATE TABLE "fact_org_daily_by_model_feature" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "model" text NOT NULL,
  "feature" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_org_daily_by_model_feature_org_id_day_model_feature_pk" PRIMARY KEY("org_id","day","model","feature")
);
--> statement-breakpoint
CREATE TABLE "fact_user_daily" (
  "user_id" bigint NOT NULL,
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "used_chat" boolean NOT NULL,
  "used_agent" boolean NOT NULL,
  "used_cli" boolean NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  "cli_prompt_count" integer NOT NULL,
  "cli_request_count" integer NOT NULL,
  "cli_session_count" integer NOT NULL,
  "cli_prompt_tokens_sum" bigint NOT NULL,
  "cli_output_tokens_sum" bigint NOT NULL,
  "ingested_at" timestamptz NOT NULL,
  CONSTRAINT "fact_user_daily_user_id_org_id_day_pk" PRIMARY KEY("user_id","org_id","day")
);
--> statement-breakpoint
CREATE TABLE "fact_user_daily_by_feature" (
  "user_id" bigint NOT NULL,
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "feature" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_user_daily_by_feature_user_id_org_id_day_feature_pk" PRIMARY KEY("user_id","org_id","day","feature")
);
--> statement-breakpoint
CREATE TABLE "fact_user_daily_by_ide" (
  "user_id" bigint NOT NULL,
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "ide" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_user_daily_by_ide_user_id_org_id_day_ide_pk" PRIMARY KEY("user_id","org_id","day","ide")
);
--> statement-breakpoint
CREATE TABLE "fact_user_daily_by_language_feature" (
  "user_id" bigint NOT NULL,
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "language" text NOT NULL,
  "feature" text NOT NULL,
  "code_acceptance_activity_count" integer NOT NULL,
  "code_generation_activity_count" integer NOT NULL,
  "loc_added_sum" bigint NOT NULL,
  "loc_deleted_sum" bigint NOT NULL,
  "loc_suggested_to_add_sum" bigint NOT NULL,
  "loc_suggested_to_delete_sum" bigint NOT NULL,
  "user_initiated_interaction_count" integer NOT NULL,
  CONSTRAINT "fact_user_daily_by_language_feature_user_id_org_id_day_language_feature_pk" PRIMARY KEY("user_id","org_id","day","language","feature")
);
--> statement-breakpoint
CREATE TABLE "bridge_user_team" (
  "user_id" bigint NOT NULL,
  "team_id" bigint NOT NULL,
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  CONSTRAINT "bridge_user_team_user_id_team_id_day_pk" PRIMARY KEY("user_id","team_id","day")
);
--> statement-breakpoint
CREATE TABLE "fact_billing_daily" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "product" text NOT NULL,
  "sku" text NOT NULL,
  "quantity" numeric NOT NULL,
  "unit" text NOT NULL,
  "gross_amount" numeric NOT NULL,
  "net_amount" numeric NOT NULL,
  "currency" text NOT NULL,
  CONSTRAINT "fact_billing_daily_org_id_day_product_sku_pk" PRIMARY KEY("org_id","day","product","sku")
);
--> statement-breakpoint
CREATE TABLE "fact_ai_credits_daily" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "model" text NOT NULL,
  "feature" text NOT NULL,
  "included_quantity" numeric NOT NULL,
  "billed_quantity" numeric NOT NULL,
  "billed_amount" numeric NOT NULL,
  "currency" text NOT NULL,
  CONSTRAINT "fact_ai_credits_daily_org_id_day_model_feature_pk" PRIMARY KEY("org_id","day","model","feature")
);
--> statement-breakpoint
CREATE TABLE "ingestion_run" (
  "run_id" uuid PRIMARY KEY NOT NULL,
  "source" text NOT NULL,
  "org_id" text,
  "target_day" date,
  "started_at" timestamptz NOT NULL,
  "completed_at" timestamptz,
  "status" text NOT NULL,
  "rows_written" integer NOT NULL,
  "bronze_path" text,
  "error_message" text,
  "attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fact_value_daily" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "estimator" text NOT NULL,
  "hours_saved" numeric NOT NULL,
  "dollars_saved" numeric NOT NULL,
  "knob_snapshot" jsonb NOT NULL,
  CONSTRAINT "fact_value_daily_org_id_day_estimator_pk" PRIMARY KEY("org_id","day","estimator")
);
--> statement-breakpoint
CREATE TABLE "fact_roi_daily" (
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "hours_saved_blended" numeric NOT NULL,
  "dollars_saved_blended" numeric NOT NULL,
  "total_spend" numeric NOT NULL,
  "net_value" numeric NOT NULL,
  "roi_ratio" numeric NOT NULL,
  CONSTRAINT "fact_roi_daily_org_id_day_pk" PRIMARY KEY("org_id","day")
);
--> statement-breakpoint
CREATE TABLE "fact_team_value_daily" (
  "team_id" bigint NOT NULL,
  "org_id" text NOT NULL,
  "day" date NOT NULL,
  "estimator" text NOT NULL,
  "hours_saved" numeric NOT NULL,
  "dollars_saved" numeric NOT NULL,
  CONSTRAINT "fact_team_value_daily_team_id_day_estimator_pk" PRIMARY KEY("team_id","day","estimator")
);
--> statement-breakpoint
ALTER TABLE "dim_team" ADD CONSTRAINT "dim_team_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily" ADD CONSTRAINT "fact_org_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_feature" ADD CONSTRAINT "fact_org_daily_by_feature_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_feature" ADD CONSTRAINT "fact_org_daily_by_feature_feature_dim_feature_name_fk" FOREIGN KEY ("feature") REFERENCES "public"."dim_feature"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_ide" ADD CONSTRAINT "fact_org_daily_by_ide_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_ide" ADD CONSTRAINT "fact_org_daily_by_ide_ide_dim_ide_name_fk" FOREIGN KEY ("ide") REFERENCES "public"."dim_ide"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_language_feature" ADD CONSTRAINT "fact_org_daily_by_language_feature_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_language_feature" ADD CONSTRAINT "fact_org_daily_by_language_feature_language_dim_language_name_fk" FOREIGN KEY ("language") REFERENCES "public"."dim_language"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_language_feature" ADD CONSTRAINT "fact_org_daily_by_language_feature_feature_dim_feature_name_fk" FOREIGN KEY ("feature") REFERENCES "public"."dim_feature"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_language_model" ADD CONSTRAINT "fact_org_daily_by_language_model_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_language_model" ADD CONSTRAINT "fact_org_daily_by_language_model_language_dim_language_name_fk" FOREIGN KEY ("language") REFERENCES "public"."dim_language"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_language_model" ADD CONSTRAINT "fact_org_daily_by_language_model_model_dim_model_name_fk" FOREIGN KEY ("model") REFERENCES "public"."dim_model"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_model_feature" ADD CONSTRAINT "fact_org_daily_by_model_feature_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_model_feature" ADD CONSTRAINT "fact_org_daily_by_model_feature_model_dim_model_name_fk" FOREIGN KEY ("model") REFERENCES "public"."dim_model"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_org_daily_by_model_feature" ADD CONSTRAINT "fact_org_daily_by_model_feature_feature_dim_feature_name_fk" FOREIGN KEY ("feature") REFERENCES "public"."dim_feature"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily" ADD CONSTRAINT "fact_user_daily_user_id_dim_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dim_user"("user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily" ADD CONSTRAINT "fact_user_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_feature" ADD CONSTRAINT "fact_user_daily_by_feature_user_id_dim_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dim_user"("user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_feature" ADD CONSTRAINT "fact_user_daily_by_feature_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_feature" ADD CONSTRAINT "fact_user_daily_by_feature_feature_dim_feature_name_fk" FOREIGN KEY ("feature") REFERENCES "public"."dim_feature"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_ide" ADD CONSTRAINT "fact_user_daily_by_ide_user_id_dim_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dim_user"("user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_ide" ADD CONSTRAINT "fact_user_daily_by_ide_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_ide" ADD CONSTRAINT "fact_user_daily_by_ide_ide_dim_ide_name_fk" FOREIGN KEY ("ide") REFERENCES "public"."dim_ide"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_language_feature" ADD CONSTRAINT "fact_user_daily_by_language_feature_user_id_dim_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dim_user"("user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_language_feature" ADD CONSTRAINT "fact_user_daily_by_language_feature_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_language_feature" ADD CONSTRAINT "fact_user_daily_by_language_feature_language_dim_language_name_fk" FOREIGN KEY ("language") REFERENCES "public"."dim_language"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_user_daily_by_language_feature" ADD CONSTRAINT "fact_user_daily_by_language_feature_feature_dim_feature_name_fk" FOREIGN KEY ("feature") REFERENCES "public"."dim_feature"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bridge_user_team" ADD CONSTRAINT "bridge_user_team_user_id_dim_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dim_user"("user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bridge_user_team" ADD CONSTRAINT "bridge_user_team_team_id_dim_team_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."dim_team"("team_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bridge_user_team" ADD CONSTRAINT "bridge_user_team_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_billing_daily" ADD CONSTRAINT "fact_billing_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_ai_credits_daily" ADD CONSTRAINT "fact_ai_credits_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_ai_credits_daily" ADD CONSTRAINT "fact_ai_credits_daily_model_dim_model_name_fk" FOREIGN KEY ("model") REFERENCES "public"."dim_model"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_ai_credits_daily" ADD CONSTRAINT "fact_ai_credits_daily_feature_dim_feature_name_fk" FOREIGN KEY ("feature") REFERENCES "public"."dim_feature"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ingestion_run" ADD CONSTRAINT "ingestion_run_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_value_daily" ADD CONSTRAINT "fact_value_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_roi_daily" ADD CONSTRAINT "fact_roi_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_team_value_daily" ADD CONSTRAINT "fact_team_value_daily_team_id_dim_team_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."dim_team"("team_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fact_team_value_daily" ADD CONSTRAINT "fact_team_value_daily_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "dim_user_user_login_idx" ON "dim_user" USING btree ("user_login");
--> statement-breakpoint
CREATE INDEX "dim_user_pseudonym_idx" ON "dim_user" USING btree ("pseudonym");
--> statement-breakpoint
CREATE INDEX "fact_org_daily_day_desc_idx" ON "fact_org_daily" USING btree ("day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_org_daily_org_id_day_desc_idx" ON "fact_org_daily" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_org_daily_by_feature_org_id_day_desc_idx" ON "fact_org_daily_by_feature" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_org_daily_by_ide_org_id_day_desc_idx" ON "fact_org_daily_by_ide" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_org_daily_by_language_feature_org_id_day_desc_idx" ON "fact_org_daily_by_language_feature" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_org_daily_by_language_model_org_id_day_desc_idx" ON "fact_org_daily_by_language_model" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_org_daily_by_model_feature_org_id_day_desc_idx" ON "fact_org_daily_by_model_feature" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_user_daily_user_id_day_desc_idx" ON "fact_user_daily" USING btree ("user_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_user_daily_by_feature_user_id_day_desc_idx" ON "fact_user_daily_by_feature" USING btree ("user_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_user_daily_by_ide_user_id_day_desc_idx" ON "fact_user_daily_by_ide" USING btree ("user_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_user_daily_by_language_feature_user_id_day_desc_idx" ON "fact_user_daily_by_language_feature" USING btree ("user_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "bridge_user_team_user_id_day_desc_idx" ON "bridge_user_team" USING btree ("user_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_billing_daily_org_id_day_desc_idx" ON "fact_billing_daily" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_ai_credits_daily_org_id_day_desc_idx" ON "fact_ai_credits_daily" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_value_daily_org_id_day_desc_idx" ON "fact_value_daily" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_roi_daily_org_id_day_desc_idx" ON "fact_roi_daily" USING btree ("org_id","day" DESC);
--> statement-breakpoint
CREATE INDEX "fact_team_value_daily_team_id_day_desc_idx" ON "fact_team_value_daily" USING btree ("team_id","day" DESC);
