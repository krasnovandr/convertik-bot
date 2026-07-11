param(
  [Parameter(Mandatory = $true)] [string]$ResourceGroup,
  [Parameter(Mandatory = $true)] [string]$FunctionAppName,
  [string]$ZipPath = ".\deploy.zip"
)

$ErrorActionPreference = "Stop"

# Navigate to the repository root directory
$repoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")
Push-Location $repoRoot

try {
  # 1. Build TypeScript project
  Write-Host "📦 Building TypeScript project..." -ForegroundColor Cyan
  npm run build

  # 2. Remove devDependencies to minimize package size
  Write-Host "🗑️ Removing dev dependencies for production..." -ForegroundColor Yellow
  npm prune --production

  # 3. Create ZIP package (old file will be overwritten automatically due to -Force)
  Write-Host "🤐 Creating deployment package at $ZipPath ..." -ForegroundColor Cyan
  Compress-Archive -Path dist, node_modules, host.json, package.json, package-lock.json -DestinationPath $ZipPath -Force

  # 4. Deploy package to Azure Function App
  Write-Host "🚀 Deploying package to Azure Function App..." -ForegroundColor Green
  az functionapp deployment source config-zip --resource-group $ResourceGroup --name $FunctionAppName --src $ZipPath

  Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
}
finally {
  # 5. Restore devDependencies so local development environment remains intact
  Write-Host "🔄 Restoring dev dependencies for local development..." -ForegroundColor Cyan
  npm install

  Pop-Location
}