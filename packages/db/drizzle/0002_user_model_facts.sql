CREATE TABLE IF NOT EXISTS "fact_user_daily_by_language_model" (
  "user_id" bigint NOT NULL,
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
  CONSTRAINT "fact_user_daily_by_language_model_user_id_org_id_day_language_model_pk" PRIMARY KEY("user_id","org_id","day","language","model"),
  CONSTRAINT "fact_user_daily_by_language_model_user_id_dim_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dim_user"("user_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_user_daily_by_language_model_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_user_daily_by_language_model_language_dim_language_name_fk" FOREIGN KEY ("language") REFERENCES "public"."dim_language"("name") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_user_daily_by_language_model_model_dim_model_name_fk" FOREIGN KEY ("model") REFERENCES "public"."dim_model"("name") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_user_daily_by_model_feature" (
  "user_id" bigint NOT NULL,
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
  CONSTRAINT "fact_user_daily_by_model_feature_user_id_org_id_day_model_feature_pk" PRIMARY KEY("user_id","org_id","day","model","feature"),
  CONSTRAINT "fact_user_daily_by_model_feature_user_id_dim_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dim_user"("user_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_user_daily_by_model_feature_org_id_dim_org_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."dim_org"("org_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_user_daily_by_model_feature_model_dim_model_name_fk" FOREIGN KEY ("model") REFERENCES "public"."dim_model"("name") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "fact_user_daily_by_model_feature_feature_dim_feature_name_fk" FOREIGN KEY ("feature") REFERENCES "public"."dim_feature"("name") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_user_daily_by_language_model_user_id_day_desc_idx" ON "fact_user_daily_by_language_model" USING btree ("user_id","day" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_user_daily_by_model_feature_user_id_day_desc_idx" ON "fact_user_daily_by_model_feature" USING btree ("user_id","day" DESC NULLS LAST);
