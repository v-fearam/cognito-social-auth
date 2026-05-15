param(
    [string]$Configuration = "Release",
    [string]$OutputDir = "./out/publish",
    [string]$ZipName = "pretoken-tier.zip"
)

$ErrorActionPreference = "Stop"

$projectPath = Join-Path $PSScriptRoot "pretoken-tier.csproj"
$publishDir = Join-Path $PSScriptRoot $OutputDir
$zipPath = Join-Path $PSScriptRoot $ZipName

if (Test-Path $publishDir) {
    Remove-Item -Path $publishDir -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

dotnet publish $projectPath -c $Configuration -o $publishDir

if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $zipPath -Force

Write-Host "ZIP ready: $zipPath"
Write-Host "Upload this ZIP in Azure Portal: Deployment Center -> Source: Publish files (new)"
