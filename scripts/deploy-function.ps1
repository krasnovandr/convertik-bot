param(
  [Parameter(Mandatory = $true)]
  [string]$ResourceGroup,

  [Parameter(Mandatory = $true)]
  [string]$FunctionAppName,

  [string]$ZipPath = ".\\deploy.zip"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

Push-Location $repoRoot
try {
  Write-Host "Building TypeScript project..."
  npm run build

  Write-Host "Installing production dependencies..."
  npm ci --omit=dev

  if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
  }

  Write-Host "Creating deployment package at $ZipPath ..."
  Compress-Archive -Path dist,node_modules,host.json,package.json,package-lock.json -DestinationPath $ZipPath -Force

# # 1. Remove build-related app settings not supported on this SKU for zip deploy
# Write-Host "Removing SCM_DO_BUILD_DURING_DEPLOYMENT / ENABLE_ORYX_BUILD app settings..." -ForegroundColor Cyan
# az functionapp config appsettings delete `
#     --resource-group $ResourceGroup `
#     --name $FunctionAppName `
#     --setting-names SCM_DO_BUILD_DURING_DEPLOYMENT ENABLE_ORYX_BUILD `
#     --output none

# 2. Deploy package to Azure Function App
Write-Host "Deploying package to Azure Function App..." -ForegroundColor Cyan
az functionapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $FunctionAppName `
    --src $ZipPath

# 3. Sync function triggers (Optional: Only keep this if Azure is giving you sync errors)
Write-Host "Syncing function triggers..." -ForegroundColor Cyan
$siteId = az functionapp show --resource-group $ResourceGroup --name $FunctionAppName --query id -o tsv
az rest --method post --uri "https://management.azure.com$siteId/syncfunctiontriggers?api-version=2023-12-01"
  Write-Host "Deployment completed."
}
finally {
  Pop-Location
}
