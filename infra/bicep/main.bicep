targetScope = 'resourceGroup'

@description('Short name used to derive Azure resource names. Use lowercase letters, numbers, and hyphens where possible.')
@minLength(2)
@maxLength(18)
param namePrefix string = 'ghcpdash'

@description('Deployment environment label, such as dev, test, or prod. Used in names and tags.')
@minLength(2)
@maxLength(12)
param environmentName string = 'dev'

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Additional tags to apply to provisioned resources.')
param tags object = {}

@description('Existing or future fully qualified image reference for the web app. Leave blank to use the created ACR login server plus ghcp-web:<imageTag>.')
param webImage string = ''

@description('Existing or future fully qualified image reference for the collector job. Leave blank to use the created ACR login server plus ghcp-collector:<imageTag>.')
param collectorImage string = ''

@description('Existing or future fully qualified image reference for the migration/bootstrap job. Leave blank to reuse the collector image, which carries the DB migration runner.')
param migrationImage string = ''

@description('Image tag used when webImage or collectorImage is left blank. Prefer immutable release tags or digests for production.')
param imageTag string = 'latest'

@description('Azure Container Registry SKU for the deployment-local registry.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'

@description('Log Analytics retention in days.')
@minValue(30)
@maxValue(730)
param logRetentionDays int = 30

@description('PostgreSQL Flexible Server administrator username. Prefer a non-default name in production.')
param postgresAdminUsername string

@secure()
@description('PostgreSQL Flexible Server administrator password. If generated DATABASE_URL secrets are used, choose a URL-safe password or pass explicit database URL overrides.')
param postgresAdminPassword string

@secure()
@description('Password for the least-privilege web_readonly database role.')
param webReadonlyPassword string

@secure()
@description('Password for the collector_writer database role.')
param collectorWriterPassword string

@secure()
@description('Password for the migration_admin database role.')
param migrationAdminPassword string

@description('Database name to create on the PostgreSQL Flexible Server.')
param databaseName string = 'ghcp_metrics'

@description('PostgreSQL Flexible Server SKU name.')
param postgresSkuName string = 'Standard_B1ms'

@description('PostgreSQL Flexible Server SKU tier.')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param postgresSkuTier string = 'Burstable'

@description('PostgreSQL storage size in GiB.')
@minValue(32)
@maxValue(32768)
param postgresStorageGb int = 32

@description('PostgreSQL automated backup retention in days.')
@minValue(7)
@maxValue(35)
param postgresBackupRetentionDays int = 7

@description('PostgreSQL geo-redundant backup setting.')
@allowed([
  'Enabled'
  'Disabled'
])
param postgresGeoRedundantBackup string = 'Disabled'

@description('Allows Azure-hosted services to reach Postgres over the public endpoint. Disable only after adding private networking outside this minimal foundation.')
param allowAzureIpsToPostgres bool = true

@secure()
@description('Optional explicit DATABASE_URL for the web app. Use this for a read-only database role after role bootstrap. If blank, the admin DATABASE_URL is stored as a P1 caveat.')
param webDatabaseUrl string = ''

@secure()
@description('Optional explicit DATABASE_URL for the collector job. Use this for a writer database role after role bootstrap. If blank, the admin DATABASE_URL is stored as a P1 caveat.')
param collectorDatabaseUrl string = ''

@secure()
@description('Optional explicit DATABASE_URL for migrations/admin automation. If blank, the admin DATABASE_URL is stored.')
param migrationDatabaseUrl string = ''

@description('Use Key Vault references in Container Apps. Disable only when policy blocks Key Vault data-plane access; values remain encrypted Container Apps secrets and are also stored in Key Vault.')
param useKeyVaultReferences bool = true

@secure()
@description('Classic GitHub PAT for the collector. The web app never receives this secret.')
param githubToken string

@description('Comma-separated GitHub organization slugs to ingest. Optional when githubEnterprise is set.')
param githubOrgs string = ''

@description('Single GitHub enterprise slug to ingest. Optional when githubOrgs is set.')
param githubEnterprise string = ''

@description('GitHub API base URL. Use https://api.github.com for GitHub.com or a GHES API URL.')
param githubApiBaseUrl string = 'https://api.github.com'

@description('Enable preview delivery ingestion sources in the collector.')
param githubIngestDelivery bool = false

@secure()
@description('Shared dashboard auth secret used by the beta fallback. Rotate by updating the Key Vault secret and restarting the web Container App.')
param dashboardPassword string

@description('Auth cookie name used by the dashboard shared-password fallback.')
param authCookieName string = 'ghcp_dash_session'

@description('Dashboard auth mode used when Entra EasyAuth is disabled. Entra EasyAuth forces identity-header mode.')
@allowed([
  'open'
  'shared-password'
  'identity-header'
])
param authMode string = 'shared-password'

@description('Enable Azure Container Apps built-in authentication (EasyAuth) with Microsoft Entra ID for the web app.')
param enableEntraAuth bool = false

@description('Microsoft Entra application/client ID used by Container Apps EasyAuth when enableEntraAuth is true.')
param entraClientId string = ''

@secure()
@description('Microsoft Entra application client secret stored in Key Vault as entra-client-secret and referenced by EasyAuth. Required only when enableEntraAuth is true.')
param entraClientSecret string = ''

@description('Trusted identity header name read by the web app in identity-header mode. Container Apps EasyAuth injects x-ms-client-principal-name.')
param authIdentityHeader string = 'x-ms-client-principal-name'

@description('Optional public base URL. Leave blank to use the generated Container Apps URL.')
param publicAppUrl string = ''

@description('Container Apps external ingress flag for the web app.')
param webExternalIngress bool = true

@description('Web app minimum replicas.')
@minValue(0)
param webMinReplicas int = 1

@description('Web app maximum replicas.')
@minValue(1)
param webMaxReplicas int = 2

@description('Web container CPU cores.')
param webCpu string = '0.5'

@description('Web container memory.')
param webMemory string = '1Gi'

@description('Collector job cron expression, in UTC.')
param collectorCronExpression string = '0 4 * * *'

@description('Collector fetch concurrency. Safe above 1: dimension upserts are serialized by a Postgres transaction-scoped advisory lock. Use 1 only for troubleshooting or a constrained DB pool.')
@minValue(1)
@maxValue(8)
param collectorConcurrency int = 4

@description('Collector maximum GitHub retry attempts.')
@minValue(1)
@maxValue(20)
param collectorMaxRetries int = 5

@description('Collector job timeout in seconds.')
@minValue(300)
@maxValue(14400)
param collectorReplicaTimeoutSeconds int = 3600

@description('Collector job retry limit for failed replicas.')
@minValue(0)
@maxValue(10)
param collectorReplicaRetryLimit int = 1

@description('Collector container CPU cores.')
param collectorCpu string = '0.5'

@description('Collector container memory.')
param collectorMemory string = '1Gi'

@description('Migration/bootstrap job timeout in seconds.')
@minValue(300)
@maxValue(14400)
param migrationReplicaTimeoutSeconds int = 1800

@description('Migration/bootstrap job retry limit for failed replicas.')
@minValue(0)
@maxValue(10)
param migrationReplicaRetryLimit int = 0

@description('Migration/bootstrap container CPU cores.')
param migrationCpu string = '0.5'

@description('Migration/bootstrap container memory.')
param migrationMemory string = '1Gi'

@description('Maximum database connections used by the migration/bootstrap job.')
@minValue(1)
@maxValue(4)
param migrationDbMaxConnections int = 1

@description('Storage account SKU used for bronze file retention and future exports.')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_ZRS'
])
param storageSkuName string = 'Standard_LRS'

@description('Azure Files share quota, in GiB, for mounted bronze NDJSON retention.')
@minValue(1)
@maxValue(5120)
param bronzeShareQuotaGb int = 100

@description('Mount the Azure Files bronze share into the collector. Disable only when policy blocks Storage data-plane access; bronze files then use ephemeral container storage.')
param enableBronzeFileShareMount bool = true

@description('Container mount path for the bronze Azure Files share.')
param bronzeMountPath string = '/mnt/bronze'

@description('BRONZE_DIR value used by the collector inside the mounted share.')
param bronzeDir string = '/mnt/bronze/data/bronze'

@description('Log level for the collector.')
@allowed([
  'debug'
  'info'
  'warn'
  'error'
])
param collectorLogLevel string = 'info'

@description('Enable Azure Monitor action group and alert rules for web, collector, migration, Postgres, and storage signals.')
param enableAlerts bool = false

@description('Optional email receiver for Azure Monitor alerts. Required for useful alerts unless alertWebhookReceiverUrl is set.')
param alertEmailReceiver string = ''

@secure()
@description('Optional webhook receiver URL for Azure Monitor alerts. Required for useful alerts unless alertEmailReceiver is set.')
param alertWebhookReceiverUrl string = ''

@description('Stale ingestion alert threshold, in hours since the last successful ingestion_run_finalized collector log line.')
@minValue(1)
param staleIngestionThresholdHours int = 36

@description('PostgreSQL CPU percent threshold for metric alerts.')
@minValue(1)
@maxValue(100)
param postgresCpuAlertThresholdPercent int = 80

@description('PostgreSQL storage percent threshold for metric alerts.')
@minValue(1)
@maxValue(100)
param postgresStorageAlertThresholdPercent int = 80

@description('Storage account capacity threshold in bytes for exports/bronze pressure alerts.')
@minValue(1)
param storageCapacityAlertThresholdBytes int = 107374182400

@description('Enable Application Insights and a standard availability test for the public /api/health endpoint.')
param enableAvailabilityTest bool = false

@description('Azure region code used by the Application Insights availability test location.')
param availabilityTestLocation string = 'us-va-ash-azr'

@description('Enable lifecycle management for the exports blob container.')
param enableExportsLifecyclePolicy bool = true

@description('Days after modification before blobs in the exports container move to cool storage.')
@minValue(1)
param exportsCoolAfterDays int = 30

@description('Days after modification before blobs in the exports container move to archive storage.')
@minValue(1)
param exportsArchiveAfterDays int = 90

@description('Days after modification before blobs in the exports container are deleted.')
@minValue(1)
param exportsDeleteAfterDays int = 365

var safePrefix = toLower(replace(replace(namePrefix, '-', ''), '_', ''))
var safeEnvironment = toLower(replace(replace(environmentName, '-', ''), '_', ''))
var dashedPrefix = toLower(replace(namePrefix, '_', '-'))
var dashedEnvironment = toLower(replace(environmentName, '_', '-'))
var suffix = uniqueString(resourceGroup().id, namePrefix, environmentName)
var baseName = '${dashedPrefix}-${dashedEnvironment}'
var globalBaseName = '${safePrefix}${safeEnvironment}${suffix}'
var commonTags = union({
  app: 'copilot-metrics-dashboard'
  environment: environmentName
  managedBy: 'bicep'
}, tags)

var acrName = take('${globalBaseName}acr', 50)
var keyVaultName = take('${safePrefix}-${safeEnvironment}-${suffix}', 24)
var postgresServerName = take('${safePrefix}-${safeEnvironment}-${suffix}-pg', 63)
var storageAccountName = take('${globalBaseName}st', 24)
var logAnalyticsName = take('${baseName}-logs', 63)
var containerEnvironmentName = take('${baseName}-cae', 32)
var webIdentityName = take('${baseName}-web-mi', 128)
var collectorIdentityName = take('${baseName}-collector-mi', 128)
var migrationIdentityName = take('${baseName}-migration-mi', 128)
var webAppName = take('${baseName}-web', 32)
var collectorJobName = take('${baseName}-collector', 32)
var migrationJobName = take('${baseName}-migrate', 32)
var bronzeFileShareName = 'bronze'
var exportsContainerName = 'exports'
var bronzeStorageMountName = 'bronze-files'
var effectiveBronzeDir = enableBronzeFileShareMount ? bronzeDir : '/tmp/bronze'
var defaultWebImage = '${acr.properties.loginServer}/ghcp-web:${imageTag}'
var defaultCollectorImage = '${acr.properties.loginServer}/ghcp-collector:${imageTag}'
var effectiveWebImage = empty(webImage) ? defaultWebImage : webImage
var effectiveCollectorImage = empty(collectorImage) ? defaultCollectorImage : collectorImage
var effectiveMigrationImage = empty(migrationImage) ? effectiveCollectorImage : migrationImage
var migrationBootstrapCommand = 'node node_modules/@ghcp-dash/db/dist/migrate.js && node node_modules/@ghcp-dash/db/dist/seed.js'
var generatedWebDatabaseUrl = 'postgres://${uriComponent('web_readonly')}:${uriComponent(webReadonlyPassword)}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
var generatedCollectorDatabaseUrl = 'postgres://${uriComponent('collector_writer')}:${uriComponent(collectorWriterPassword)}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
var generatedMigrationDatabaseUrl = 'postgres://${uriComponent('migration_admin')}:${uriComponent(migrationAdminPassword)}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
var effectiveWebDatabaseUrl = empty(webDatabaseUrl) ? generatedWebDatabaseUrl : webDatabaseUrl
var effectiveCollectorDatabaseUrl = empty(collectorDatabaseUrl) ? generatedCollectorDatabaseUrl : collectorDatabaseUrl
var effectiveMigrationDatabaseUrl = empty(migrationDatabaseUrl) ? generatedMigrationDatabaseUrl : migrationDatabaseUrl
var generatedPublicAppUrl = 'https://${webAppName}.${containerEnvironment.properties.defaultDomain}'
var effectivePublicAppUrl = empty(publicAppUrl) ? generatedPublicAppUrl : publicAppUrl
var webAuthMode = enableEntraAuth ? 'identity-header' : authMode
var actionGroupName = take('${baseName}-ops-ag', 260)
var appInsightsName = take('${baseName}-appi', 255)
var availabilityTestName = take('${baseName}-health', 64)
var collectorRunMarker = 'ingestion_run_finalized'
var collectorRunMarkerQuery = 'ContainerAppConsoleLogs_CL | where ContainerAppName_s =~ "${collectorJobName}" | where Log_s has "${collectorRunMarker}"'
var failedCollectorQuery = '${collectorRunMarkerQuery} | extend parsed = parse_json(Log_s) | extend status = coalesce(tostring(parsed.status), extract("status[=: ]+([A-Za-z_]+)", 1, Log_s)) | where status =~ "failed" or status =~ "partial" or status =~ "error"'
var staleIngestionQuery = '${collectorRunMarkerQuery} | extend parsed = parse_json(Log_s) | extend status = coalesce(tostring(parsed.status), extract("status[=: ]+([A-Za-z_]+)", 1, Log_s)) | where status =~ "success" | summarize LastSuccess=max(TimeGenerated) | where isnull(LastSuccess) or LastSuccess < ago(${staleIngestionThresholdHours}h)'
var migrationFailureQuery = 'ContainerAppConsoleLogs_CL | where ContainerAppName_s =~ "${migrationJobName}" | where Log_s has_any ("ERROR", "Error", "failed", "permission denied", "migration failed")'
var githubApiErrorQuery = 'ContainerAppConsoleLogs_CL | where ContainerAppName_s =~ "${collectorJobName}" | where Log_s has_any ("GitHub API", "github api", "rate limit", "Bad credentials", "HTTP 401", "HTTP 403", "HTTP 429", "HTTP 500", "HTTP 502", "HTTP 503")'
var webHealthFailureQuery = 'availabilityResults | where name =~ "${availabilityTestName}" | where success == false'
var alertActionGroupIds = enableAlerts ? [ actionGroup.id ] : []
var acrPullRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
var keyVaultSecretsUserRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
var storageBlobDataContributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logRetentionDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (enableAvailabilityTest) {
  name: appInsightsName
  location: location
  tags: commonTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource availabilityTest 'Microsoft.Insights/webtests@2022-06-15' = if (enableAvailabilityTest) {
  name: availabilityTestName
  location: location
  tags: union(commonTags, {
    'hidden-link:${appInsights.id}': 'Resource'
  })
  kind: 'standard'
  properties: {
    SyntheticMonitorId: availabilityTestName
    Name: availabilityTestName
    Enabled: true
    Frequency: 300
    Timeout: 30
    Kind: 'standard'
    RetryEnabled: true
    Locations: [
      {
        Id: availabilityTestLocation
      }
    ]
    Request: {
      RequestUrl: '${effectivePublicAppUrl}/api/health'
      HttpVerb: 'GET'
      ParseDependentRequests: false
    }
    ValidationRules: {
      ExpectedHttpStatusCode: 200
      SSLCheck: true
    }
  }
}

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = if (enableAlerts) {
  name: actionGroupName
  location: 'global'
  tags: commonTags
  properties: {
    groupShortName: take('${safePrefix}${safeEnvironment}', 12)
    enabled: true
    emailReceivers: empty(alertEmailReceiver) ? [] : [
      {
        name: 'primary-email'
        emailAddress: alertEmailReceiver
        useCommonAlertSchema: true
      }
    ]
    webhookReceivers: empty(alertWebhookReceiverUrl) ? [] : [
      {
        name: 'primary-webhook'
        serviceUri: alertWebhookReceiverUrl
        useCommonAlertSchema: true
      }
    ]
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: commonTags
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource webIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: webIdentityName
  location: location
  tags: commonTags
}

resource collectorIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: collectorIdentityName
  location: location
  tags: commonTags
}

resource migrationIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: migrationIdentityName
  location: location
  tags: commonTags
}

resource webAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, webIdentity.id, 'acr-pull')
  scope: acr
  properties: {
    roleDefinitionId: acrPullRoleDefinitionId
    principalId: webIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource collectorAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, collectorIdentity.id, 'acr-pull')
  scope: acr
  properties: {
    roleDefinitionId: acrPullRoleDefinitionId
    principalId: collectorIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource migrationAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, migrationIdentity.id, 'acr-pull')
  scope: acr
  properties: {
    roleDefinitionId: acrPullRoleDefinitionId
    principalId: migrationIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: commonTags
  sku: {
    name: storageSkuName
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: enableBronzeFileShareMount ? 'Enabled' : 'Disabled'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource exportsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: exportsContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource exportsLifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = if (enableExportsLifecyclePolicy) {
  parent: storageAccount
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          enabled: true
          name: 'exports-archive-retention'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                '${exportsContainerName}/'
              ]
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: exportsCoolAfterDays
                }
                tierToArchive: {
                  daysAfterModificationGreaterThan: exportsArchiveAfterDays
                }
                delete: {
                  daysAfterModificationGreaterThan: exportsDeleteAfterDays
                }
              }
            }
          }
        }
      ]
    }
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource bronzeFileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  parent: fileService
  name: bronzeFileShareName
  properties: {
    enabledProtocols: 'SMB'
    shareQuota: bronzeShareQuotaGb
  }
}

resource collectorStorageBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableBronzeFileShareMount) {
  name: guid(storageAccount.id, collectorIdentity.id, 'blob-data-contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
    principalId: collectorIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: commonTags
  properties: {
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForTemplateDeployment: true
    publicNetworkAccess: useKeyVaultReferences ? 'Enabled' : 'Disabled'
    softDeleteRetentionInDays: 30
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: useKeyVaultReferences ? 'Allow' : 'Deny'
    }
  }
}

// Least-privilege Key Vault access: each identity is scoped to only the secrets it needs, so the
// web identity cannot read the collector's github-token even though it shares the vault.
resource webDbUrlSecretUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (useKeyVaultReferences) {
  name: guid(webDatabaseUrlSecret.id, webIdentity.id, 'secrets-user')
  scope: webDatabaseUrlSecret
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: webIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource webDashboardPasswordSecretUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (useKeyVaultReferences) {
  name: guid(dashboardPasswordSecret.id, webIdentity.id, 'secrets-user')
  scope: dashboardPasswordSecret
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: webIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource webEntraClientSecretUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (useKeyVaultReferences && enableEntraAuth) {
  name: guid(entraClientSecretSecret.id, webIdentity.id, 'secrets-user')
  scope: entraClientSecretSecret
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: webIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource collectorDbUrlSecretUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (useKeyVaultReferences) {
  name: guid(collectorDatabaseUrlSecret.id, collectorIdentity.id, 'secrets-user')
  scope: collectorDatabaseUrlSecret
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: collectorIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource collectorGithubTokenSecretUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (useKeyVaultReferences) {
  name: guid(githubTokenSecret.id, collectorIdentity.id, 'secrets-user')
  scope: githubTokenSecret
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: collectorIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource migrationDbUrlSecretUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (useKeyVaultReferences) {
  name: guid(migrationDatabaseUrlSecret.id, migrationIdentity.id, 'secrets-user')
  scope: migrationDatabaseUrlSecret
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: migrationIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource webDatabaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'web-database-url'
  properties: {
    value: effectiveWebDatabaseUrl
  }
}

resource collectorDatabaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'collector-database-url'
  properties: {
    value: effectiveCollectorDatabaseUrl
  }
}

resource migrationDatabaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'migration-database-url'
  properties: {
    value: effectiveMigrationDatabaseUrl
  }
}

resource githubTokenSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'github-token'
  properties: {
    value: githubToken
  }
}

resource dashboardPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'dashboard-password'
  properties: {
    value: dashboardPassword
  }
}

resource entraClientSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'entra-client-secret'
  properties: {
    value: empty(entraClientSecret) ? 'not-configured' : entraClientSecret
  }
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: postgresServerName
  location: location
  tags: commonTags
  sku: {
    name: postgresSkuName
    tier: postgresSkuTier
  }
  properties: {
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: {
      storageSizeGB: postgresStorageGb
    }
    backup: {
      backupRetentionDays: postgresBackupRetentionDays
      geoRedundantBackup: postgresGeoRedundantBackup
    }
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource allowAzurePostgresAccess 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = if (allowAzureIpsToPostgres) {
  parent: postgresServer
  name: 'AllowAllAzureServicesAndResourcesWithinAzureIps_2021-02-01'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource containerEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerEnvironmentName
  location: location
  tags: commonTags
  properties: {
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: logWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

resource bronzeEnvironmentStorage 'Microsoft.App/managedEnvironments/storages@2024-03-01' = if (enableBronzeFileShareMount) {
  parent: containerEnvironment
  name: bronzeStorageMountName
  properties: {
    azureFile: {
      accountName: storageAccount.name
      accountKey: storageAccount.listKeys().keys[0].value
      shareName: bronzeFileShare.name
      accessMode: 'ReadWrite'
    }
  }
}

resource migrationJob 'Microsoft.App/jobs@2024-03-01' = {
  name: migrationJobName
  location: location
  tags: commonTags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${migrationIdentity.id}': {}
    }
  }
  properties: {
    environmentId: containerEnvironment.id
    workloadProfileName: 'Consumption'
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: migrationReplicaTimeoutSeconds
      replicaRetryLimit: migrationReplicaRetryLimit
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: migrationIdentity.id
        }
      ]
      secrets: [
        useKeyVaultReferences ? {
          name: 'migration-database-url'
          keyVaultUrl: migrationDatabaseUrlSecret.properties.secretUri
          identity: migrationIdentity.id
        } : {
          name: 'migration-database-url'
          value: effectiveMigrationDatabaseUrl
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'migration-bootstrap'
          image: effectiveMigrationImage
          command: [
            'sh'
            '-lc'
          ]
          args: [
            migrationBootstrapCommand
          ]
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'migration-database-url'
            }
            {
              name: 'DB_MAX_CONNECTIONS'
              value: string(migrationDbMaxConnections)
            }
          ]
          resources: {
            cpu: json(migrationCpu)
            memory: migrationMemory
          }
        }
      ]
    }
  }
  dependsOn: [
    migrationAcrPull
    migrationDbUrlSecretUser
    postgresDatabase
    allowAzurePostgresAccess
  ]
}

resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: webAppName
  location: location
  tags: union(commonTags, {
    'azd-service-name': 'web'
  })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${webIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnvironment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: webExternalIngress
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: webIdentity.id
        }
      ]
      secrets: concat([
        useKeyVaultReferences ? {
          name: 'web-database-url'
          keyVaultUrl: webDatabaseUrlSecret.properties.secretUri
          identity: webIdentity.id
        } : {
          name: 'web-database-url'
          value: effectiveWebDatabaseUrl
        }
        useKeyVaultReferences ? {
          name: 'dashboard-password'
          keyVaultUrl: dashboardPasswordSecret.properties.secretUri
          identity: webIdentity.id
        } : {
          name: 'dashboard-password'
          value: dashboardPassword
        }
      ], enableEntraAuth ? [
        useKeyVaultReferences ? {
          name: 'entra-client-secret'
          keyVaultUrl: entraClientSecretSecret.properties.secretUri
          identity: webIdentity.id
        } : {
          name: 'entra-client-secret'
          value: entraClientSecret
        }
      ] : [])
    }
    template: {
      containers: [
        {
          name: 'web'
          image: effectiveWebImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'web-database-url'
            }
            {
              name: 'DASHBOARD_PASSWORD'
              secretRef: 'dashboard-password'
            }
            {
              name: 'AUTH_COOKIE_NAME'
              value: authCookieName
            }
            {
              name: 'AUTH_MODE'
              value: webAuthMode
            }
            {
              name: 'AUTH_IDENTITY_HEADER'
              value: authIdentityHeader
            }
            {
              name: 'NEXT_PUBLIC_APP_URL'
              value: effectivePublicAppUrl
            }
            {
              name: 'NEXT_PUBLIC_BASE_URL'
              value: effectivePublicAppUrl
            }
          ]
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 15
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 12
            }
            {
              type: 'Liveness'
              tcpSocket: {
                port: 3000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
          resources: {
            cpu: json(webCpu)
            memory: webMemory
          }
        }
      ]
      scale: {
        minReplicas: webMinReplicas
        maxReplicas: webMaxReplicas
      }
    }
  }
  dependsOn: [
    webAcrPull
    webDbUrlSecretUser
    webDashboardPasswordSecretUser
    webEntraClientSecretUser
    migrationJob
    postgresDatabase
    allowAzurePostgresAccess
  ]
}

resource webAuthConfig 'Microsoft.App/containerApps/authConfigs@2024-03-01' = if (enableEntraAuth) {
  parent: webApp
  name: 'current'
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureActiveDirectory'
      excludedPaths: [
        '/api/health'
        '/calculator'
        '/calculator/*'
        '/getting-started'
        '/getting-started/*'
        '/login'
        '/login/*'
        '/api/auth/*'
      ]
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          clientSecretSettingName: 'entra-client-secret'
          openIdIssuer: 'https://sts.windows.net/${tenant().tenantId}/v2.0'
        }
        validation: {
          allowedAudiences: [
            'api://${entraClientId}'
            entraClientId
          ]
        }
      }
    }
    login: {
      tokenStore: {
        enabled: true
      }
    }
  }
}

resource collectorJob 'Microsoft.App/jobs@2024-03-01' = {
  name: collectorJobName
  location: location
  tags: union(commonTags, {
    'azd-service-name': 'collector'
  })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${collectorIdentity.id}': {}
    }
  }
  properties: {
    environmentId: containerEnvironment.id
    workloadProfileName: 'Consumption'
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: collectorReplicaTimeoutSeconds
      replicaRetryLimit: collectorReplicaRetryLimit
      scheduleTriggerConfig: {
        cronExpression: collectorCronExpression
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: collectorIdentity.id
        }
      ]
      secrets: [
        useKeyVaultReferences ? {
          name: 'collector-database-url'
          keyVaultUrl: collectorDatabaseUrlSecret.properties.secretUri
          identity: collectorIdentity.id
        } : {
          name: 'collector-database-url'
          value: effectiveCollectorDatabaseUrl
        }
        useKeyVaultReferences ? {
          name: 'github-token'
          keyVaultUrl: githubTokenSecret.properties.secretUri
          identity: collectorIdentity.id
        } : {
          name: 'github-token'
          value: githubToken
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'collector'
          image: effectiveCollectorImage
          command: [
            'node'
            'dist/apps/collector/src/index.js'
          ]
          args: [
            'collect'
            '--concurrency'
            string(collectorConcurrency)
            '--max-retries'
            string(collectorMaxRetries)
          ]
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'collector-database-url'
            }
            {
              name: 'GITHUB_TOKEN'
              secretRef: 'github-token'
            }
            {
              name: 'GITHUB_ORGS'
              value: githubOrgs
            }
            {
              name: 'GITHUB_ENTERPRISE'
              value: githubEnterprise
            }
            {
              name: 'GITHUB_API_BASE_URL'
              value: githubApiBaseUrl
            }
            {
              name: 'GITHUB_INGEST_DELIVERY'
              value: githubIngestDelivery ? 'true' : 'false'
            }
            {
              name: 'BRONZE_DIR'
              value: effectiveBronzeDir
            }
            {
              name: 'LOG_LEVEL'
              value: collectorLogLevel
            }
          ]
          volumeMounts: enableBronzeFileShareMount ? [
            {
              volumeName: 'bronze'
              mountPath: bronzeMountPath
            }
          ] : []
          resources: {
            cpu: json(collectorCpu)
            memory: collectorMemory
          }
        }
      ]
      volumes: enableBronzeFileShareMount ? [
        {
          name: 'bronze'
          storageType: 'AzureFile'
          storageName: bronzeEnvironmentStorage.name
        }
      ] : []
    }
  }
  dependsOn: [
    collectorAcrPull
    collectorDbUrlSecretUser
    collectorGithubTokenSecretUser
    collectorStorageBlobContributor
    migrationJob
    postgresDatabase
    allowAzurePostgresAccess
  ]
}


resource failedCollectorRunAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = if (enableAlerts) {
  name: take('${baseName}-collector-failed', 260)
  location: location
  tags: commonTags
  properties: {
    displayName: 'Copilot Metrics Dashboard collector failed ingestion runs'
    description: 'Alerts when collector logs include event=ingestion_run_finalized with failed/error status.'
    severity: 2
    enabled: true
    scopes: [
      logWorkspace.id
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: failedCollectorQuery
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertActionGroupIds
    }
  }
}

resource staleIngestionAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = if (enableAlerts) {
  name: take('${baseName}-stale-ingestion', 260)
  location: location
  tags: commonTags
  properties: {
    displayName: 'Copilot Metrics Dashboard stale ingestion data'
    description: 'Alerts when no successful event=ingestion_run_finalized collector log line is observed within the configured freshness window.'
    severity: 2
    enabled: true
    scopes: [
      logWorkspace.id
    ]
    evaluationFrequency: 'PT30M'
    windowSize: 'PT${staleIngestionThresholdHours}H'
    criteria: {
      allOf: [
        {
          query: staleIngestionQuery
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertActionGroupIds
    }
  }
}

resource migrationFailureAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = if (enableAlerts) {
  name: take('${baseName}-migration-failed', 260)
  location: location
  tags: commonTags
  properties: {
    displayName: 'Copilot Metrics Dashboard migration job failures'
    description: 'Alerts when migration/bootstrap job logs include common failure markers.'
    severity: 1
    enabled: true
    scopes: [
      logWorkspace.id
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: migrationFailureQuery
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertActionGroupIds
    }
  }
}

resource githubApiErrorAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = if (enableAlerts) {
  name: take('${baseName}-github-api-errors', 260)
  location: location
  tags: commonTags
  properties: {
    displayName: 'Copilot Metrics Dashboard repeated GitHub API errors'
    description: 'Alerts on repeated GitHub API credential, rate-limit, and server-error markers in collector logs.'
    severity: 2
    enabled: true
    scopes: [
      logWorkspace.id
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: githubApiErrorQuery
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 5
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertActionGroupIds
    }
  }
}

resource webHealthFailureAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = if (enableAlerts && enableAvailabilityTest) {
  name: take('${baseName}-web-health-failed', 260)
  location: location
  tags: commonTags
  properties: {
    displayName: 'Copilot Metrics Dashboard web /api/health failures'
    description: 'Alerts when the Application Insights availability test for /api/health fails, including HTTP 503 readiness failures.'
    severity: 1
    enabled: true
    scopes: [
      appInsights.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: webHealthFailureQuery
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertActionGroupIds
    }
  }
}

resource postgresCpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlerts) {
  name: take('${baseName}-pg-cpu-high', 260)
  location: 'global'
  tags: commonTags
  properties: {
    description: 'PostgreSQL CPU percentage is above the configured threshold.'
    severity: 3
    enabled: true
    scopes: [
      postgresServer.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighCpu'
          metricName: 'cpu_percent'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: postgresCpuAlertThresholdPercent
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

resource postgresStorageAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlerts) {
  name: take('${baseName}-pg-storage-high', 260)
  location: 'global'
  tags: commonTags
  properties: {
    description: 'PostgreSQL storage percentage is above the configured threshold.'
    severity: 2
    enabled: true
    scopes: [
      postgresServer.id
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT30M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighStorage'
          metricName: 'storage_percent'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: postgresStorageAlertThresholdPercent
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

resource storageCapacityAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlerts) {
  name: take('${baseName}-storage-capacity', 260)
  location: 'global'
  tags: commonTags
  properties: {
    description: 'Storage account used capacity indicates exports or bronze storage pressure.'
    severity: 3
    enabled: true
    scopes: [
      storageAccount.id
    ]
    evaluationFrequency: 'PT1H'
    windowSize: 'PT6H'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CapacityPressure'
          metricName: 'UsedCapacity'
          metricNamespace: 'Microsoft.Storage/storageAccounts'
          operator: 'GreaterThan'
          threshold: storageCapacityAlertThresholdBytes
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

@description('Public URL for the web Container App.')
output webUrl string = effectivePublicAppUrl

@description('Public health endpoint URL for the web Container App.')
output healthUrl string = '${effectivePublicAppUrl}/api/health'

@description('Azure Container Registry name.')
output acrName string = acr.name

@description('Azure Container Registry login server for image publishing.')
output acrLoginServer string = acr.properties.loginServer

@description('Log Analytics workspace name.')
output logAnalyticsWorkspaceName string = logWorkspace.name

@description('Log Analytics workspace resource ID.')
output logAnalyticsWorkspaceId string = logWorkspace.id

@description('Container Apps managed environment name.')
output containerAppsEnvironmentName string = containerEnvironment.name

@description('Web Container App name.')
output webContainerAppName string = webApp.name

@description('Collector Container Apps Job name.')
output collectorJobName string = collectorJob.name

@description('Manual migration/bootstrap Container Apps Job name.')
output migrationJobName string = migrationJob.name

@description('Key Vault name.')
output keyVaultName string = keyVault.name

@description('Key Vault URI.')
output keyVaultUri string = keyVault.properties.vaultUri

@description('Non-secret Key Vault secret names used by the workloads.')
output keyVaultSecretNames object = {
  webDatabaseUrl: webDatabaseUrlSecret.name
  collectorDatabaseUrl: collectorDatabaseUrlSecret.name
  migrationDatabaseUrl: migrationDatabaseUrlSecret.name
  githubToken: githubTokenSecret.name
  dashboardPassword: dashboardPasswordSecret.name
  entraClientSecret: entraClientSecretSecret.name
}

@description('PostgreSQL Flexible Server name.')
output postgresServerName string = postgresServer.name

@description('PostgreSQL Flexible Server fully qualified domain name.')
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName

@description('PostgreSQL database name.')
output postgresDatabaseName string = postgresDatabase.name

@description('Web managed identity client and principal IDs.')
output webManagedIdentity object = {
  name: webIdentity.name
  clientId: webIdentity.properties.clientId
  principalId: webIdentity.properties.principalId
}

@description('Collector managed identity client and principal IDs.')
output collectorManagedIdentity object = {
  name: collectorIdentity.name
  clientId: collectorIdentity.properties.clientId
  principalId: collectorIdentity.properties.principalId
}

@description('Migration/bootstrap managed identity client and principal IDs.')
output migrationManagedIdentity object = {
  name: migrationIdentity.name
  clientId: migrationIdentity.properties.clientId
  principalId: migrationIdentity.properties.principalId
}

@description('Authentication posture configured for the web Container App.')
output auth object = {
  mode: webAuthMode
  enableEntraAuth: enableEntraAuth
  identityHeader: authIdentityHeader
  entraClientSecretName: entraClientSecretSecret.name
}

@description('Azure Monitor resources configured by this deployment.')
output monitoring object = {
  enableAlerts: enableAlerts
  actionGroupName: enableAlerts ? actionGroup.name : ''
  enableAvailabilityTest: enableAvailabilityTest
  applicationInsightsName: enableAvailabilityTest ? appInsights.name : ''
  availabilityTestName: enableAvailabilityTest ? availabilityTest.name : ''
  collectorRunMarker: collectorRunMarker
}

@description('Storage account and containers/shares for bronze retention and future exports.')
output storage object = {
  accountName: storageAccount.name
  bronzeFileShareName: enableBronzeFileShareMount ? bronzeFileShare.name : ''
  bronzeMountPath: bronzeMountPath
  bronzeDir: effectiveBronzeDir
  exportsContainerName: exportsContainer.name
}
