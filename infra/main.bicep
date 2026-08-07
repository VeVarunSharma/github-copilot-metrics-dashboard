targetScope = 'subscription'

@description('Azure resource group name to create or update for this azd environment.')
param resourceGroupName string

@description('Azure region for the resource group and all child resources.')
param location string

@description('Short name used to derive Azure resource names.')
param namePrefix string = 'ghcpdash'

@description('Deployment environment label, usually the azd environment name.')
param environmentName string

@description('Additional tags to apply to provisioned resources.')
param tags object = {}

@description('Fully qualified image reference for the web app, supplied by azd service packaging.')
param webImage string = ''

@description('Fully qualified image reference for the collector job, supplied by azd service packaging.')
param collectorImage string = ''

@description('Fully qualified image reference for the migration/bootstrap job. Defaults to collectorImage.')
param migrationImage string = ''

@description('Fallback image tag used by the resource-group module when explicit image refs are blank.')
param imageTag string = 'latest'

param acrSku string = 'Basic'
param logRetentionDays int = 30
param postgresAdminUsername string
@secure()
param postgresAdminPassword string
param databaseName string = 'ghcp_metrics'
param postgresSkuName string = 'Standard_B1ms'
param postgresSkuTier string = 'Burstable'
param postgresStorageGb string = '32'
param postgresBackupRetentionDays string = '7'
param postgresGeoRedundantBackup string = 'Disabled'
param allowAzureIpsToPostgres bool = true
@secure()
param webDatabaseUrl string = ''
@secure()
param collectorDatabaseUrl string = ''
@secure()
param migrationDatabaseUrl string = ''
@secure()
param githubToken string
param githubOrgs string = ''
param githubEnterprise string = ''
param githubApiBaseUrl string = 'https://api.github.com'
param githubIngestDelivery string = 'false'
@secure()
param dashboardPassword string
param authCookieName string = 'ghcp_dash_session'
param authMode string = 'shared-password'
param enableEntraAuth string = 'false'
param entraClientId string = ''
@secure()
param entraClientSecret string = ''
param authIdentityHeader string = 'x-ms-client-principal-name'
param publicAppUrl string = ''
param webExternalIngress bool = true
param webMinReplicas int = 1
param webMaxReplicas int = 2
param webCpu string = '0.5'
param webMemory string = '1Gi'
param collectorCronExpression string = '0 4 * * *'
param collectorConcurrency string = '4'
param collectorMaxRetries string = '5'
param collectorReplicaTimeoutSeconds int = 3600
param collectorReplicaRetryLimit int = 1
param collectorCpu string = '0.5'
param collectorMemory string = '1Gi'
param migrationReplicaTimeoutSeconds int = 1800
param migrationReplicaRetryLimit int = 0
param migrationCpu string = '0.5'
param migrationMemory string = '1Gi'
param migrationDbMaxConnections int = 1
param storageSkuName string = 'Standard_LRS'
param bronzeShareQuotaGb string = '100'
param bronzeMountPath string = '/mnt/bronze'
param bronzeDir string = '/mnt/bronze/data/bronze'
param collectorLogLevel string = 'info'
param enableAlerts string = 'false'
param alertEmailReceiver string = ''
@secure()
param alertWebhookReceiverUrl string = ''
param staleIngestionThresholdHours string = '36'
param postgresCpuAlertThresholdPercent int = 80
param postgresStorageAlertThresholdPercent int = 80
param storageCapacityAlertThresholdBytes int = 107374182400
param enableAvailabilityTest string = 'false'
param availabilityTestLocation string = 'us-va-ash-azr'
param enableExportsLifecyclePolicy string = 'true'
param exportsCoolAfterDays string = '30'
param exportsArchiveAfterDays string = '90'
param exportsDeleteAfterDays string = '365'

var commonTags = union({
  app: 'copilot-metrics-dashboard'
  environment: environmentName
  managedBy: 'azd'
}, tags)

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: resourceGroupName
  location: location
  tags: commonTags
}

module core './bicep/main.bicep' = {
  name: 'copilot-metrics-dashboard-${environmentName}'
  scope: rg
  params: {
    namePrefix: namePrefix
    environmentName: environmentName
    location: location
    tags: commonTags
    webImage: webImage
    collectorImage: collectorImage
    migrationImage: empty(migrationImage) ? collectorImage : migrationImage
    imageTag: imageTag
    acrSku: acrSku
    logRetentionDays: logRetentionDays
    postgresAdminUsername: postgresAdminUsername
    postgresAdminPassword: postgresAdminPassword
    databaseName: databaseName
    postgresSkuName: postgresSkuName
    postgresSkuTier: postgresSkuTier
    postgresStorageGb: int(postgresStorageGb)
    postgresBackupRetentionDays: int(postgresBackupRetentionDays)
    postgresGeoRedundantBackup: postgresGeoRedundantBackup
    allowAzureIpsToPostgres: allowAzureIpsToPostgres
    webDatabaseUrl: webDatabaseUrl
    collectorDatabaseUrl: collectorDatabaseUrl
    migrationDatabaseUrl: migrationDatabaseUrl
    githubToken: githubToken
    githubOrgs: githubOrgs
    githubEnterprise: githubEnterprise
    githubApiBaseUrl: githubApiBaseUrl
    githubIngestDelivery: toLower(githubIngestDelivery) == 'true'
    dashboardPassword: dashboardPassword
    authCookieName: authCookieName
    authMode: authMode
    enableEntraAuth: toLower(enableEntraAuth) == 'true'
    entraClientId: entraClientId
    entraClientSecret: entraClientSecret
    authIdentityHeader: authIdentityHeader
    publicAppUrl: publicAppUrl
    webExternalIngress: webExternalIngress
    webMinReplicas: webMinReplicas
    webMaxReplicas: webMaxReplicas
    webCpu: webCpu
    webMemory: webMemory
    collectorCronExpression: collectorCronExpression
    collectorConcurrency: int(collectorConcurrency)
    collectorMaxRetries: int(collectorMaxRetries)
    collectorReplicaTimeoutSeconds: collectorReplicaTimeoutSeconds
    collectorReplicaRetryLimit: collectorReplicaRetryLimit
    collectorCpu: collectorCpu
    collectorMemory: collectorMemory
    migrationReplicaTimeoutSeconds: migrationReplicaTimeoutSeconds
    migrationReplicaRetryLimit: migrationReplicaRetryLimit
    migrationCpu: migrationCpu
    migrationMemory: migrationMemory
    migrationDbMaxConnections: migrationDbMaxConnections
    storageSkuName: storageSkuName
    bronzeShareQuotaGb: int(bronzeShareQuotaGb)
    bronzeMountPath: bronzeMountPath
    bronzeDir: bronzeDir
    collectorLogLevel: collectorLogLevel
    enableAlerts: toLower(enableAlerts) == 'true'
    alertEmailReceiver: alertEmailReceiver
    alertWebhookReceiverUrl: alertWebhookReceiverUrl
    staleIngestionThresholdHours: int(staleIngestionThresholdHours)
    postgresCpuAlertThresholdPercent: postgresCpuAlertThresholdPercent
    postgresStorageAlertThresholdPercent: postgresStorageAlertThresholdPercent
    storageCapacityAlertThresholdBytes: storageCapacityAlertThresholdBytes
    enableAvailabilityTest: toLower(enableAvailabilityTest) == 'true'
    availabilityTestLocation: availabilityTestLocation
    enableExportsLifecyclePolicy: toLower(enableExportsLifecyclePolicy) == 'true'
    exportsCoolAfterDays: int(exportsCoolAfterDays)
    exportsArchiveAfterDays: int(exportsArchiveAfterDays)
    exportsDeleteAfterDays: int(exportsDeleteAfterDays)
  }
}

output WEB_URL string = core.outputs.webUrl
output HEALTH_URL string = core.outputs.healthUrl
output ACR_NAME string = core.outputs.acrName
output ACR_LOGIN_SERVER string = core.outputs.acrLoginServer
output LOG_ANALYTICS_WORKSPACE_NAME string = core.outputs.logAnalyticsWorkspaceName
output LOG_ANALYTICS_WORKSPACE_ID string = core.outputs.logAnalyticsWorkspaceId
output CONTAINER_APPS_ENVIRONMENT_NAME string = core.outputs.containerAppsEnvironmentName
output WEB_CONTAINER_APP_NAME string = core.outputs.webContainerAppName
output COLLECTOR_JOB_NAME string = core.outputs.collectorJobName
output MIGRATION_JOB_NAME string = core.outputs.migrationJobName
output KEY_VAULT_NAME string = core.outputs.keyVaultName
output KEY_VAULT_URI string = core.outputs.keyVaultUri
output POSTGRES_SERVER_NAME string = core.outputs.postgresServerName
output POSTGRES_FQDN string = core.outputs.postgresFqdn
output POSTGRES_DATABASE_NAME string = core.outputs.postgresDatabaseName
output WEB_MANAGED_IDENTITY object = core.outputs.webManagedIdentity
output COLLECTOR_MANAGED_IDENTITY object = core.outputs.collectorManagedIdentity
output MIGRATION_MANAGED_IDENTITY object = core.outputs.migrationManagedIdentity
output KEY_VAULT_SECRET_NAMES object = core.outputs.keyVaultSecretNames
output AUTH object = core.outputs.auth
output MONITORING object = core.outputs.monitoring
output STORAGE object = core.outputs.storage
