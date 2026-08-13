using './main.bicep'

param namePrefix = 'ghcpdash'
param environmentName = 'dev'
param location = 'eastus'

// Prefer immutable tags or digests once release images are published.
param imageTag = '0.1.0'
// param webImage = 'myregistry.azurecr.io/ghcp-web:0.1.0'
// param collectorImage = 'myregistry.azurecr.io/ghcp-collector:0.1.0'

param postgresAdminUsername = 'ghcpadmin'
param postgresAdminPassword = '<replace-with-strong-password>'
param postgresBackupRetentionDays = 7
param postgresGeoRedundantBackup = 'Disabled'

// Leave database URL overrides blank for a first foundation deploy. For production,
// bootstrap separate roles and pass web/collector/migration DATABASE_URL values.
param webDatabaseUrl = ''
param collectorDatabaseUrl = ''
param migrationDatabaseUrl = ''

param githubToken = '<replace-with-github-classic-pat>'
param githubOrgs = 'my-org'
param githubEnterprise = ''
param dashboardPassword = '<replace-with-high-entropy-dashboard-secret>'

// Production-recommended auth posture is Container Apps EasyAuth + Entra.
param authMode = 'shared-password'
param enableEntraAuth = false
param entraClientId = ''
param entraClientSecret = ''

param collectorCronExpression = '0 4 * * *'
param collectorConcurrency = 1

// Optional alerting and synthetic availability.
param enableAlerts = false
param alertEmailReceiver = ''
param alertWebhookReceiverUrl = ''
param staleIngestionThresholdHours = 36
param enableAvailabilityTest = false

// Storage posture: Azure Files bronze share quota plus exports blob lifecycle.
param bronzeShareQuotaGb = 100
param enableExportsLifecyclePolicy = true
param exportsCoolAfterDays = 30
param exportsArchiveAfterDays = 90
param exportsDeleteAfterDays = 365
