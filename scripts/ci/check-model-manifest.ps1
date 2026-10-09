[CmdletBinding()]
param(
    [string]$ManifestPath = 'models/manifest.json'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Write-Host 'Model manifest: not present yet; no model artifact is required for this change.'
    exit 0
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$models = @($manifest.models)
if ($models.Count -eq 0) {
    throw 'Model manifest must contain at least one model when present.'
}

foreach ($model in $models) {
    foreach ($property in 'version', 'sha256', 'license') {
        if ([string]::IsNullOrWhiteSpace([string]$model.$property)) {
            throw "Model manifest entry is missing required '$property'."
        }
    }
    if ([string]$model.sha256 -notmatch '^[a-fA-F0-9]{64}$') {
        throw 'Model manifest sha256 must be a 64-character hexadecimal digest.'
    }
}

Write-Host "Model manifest verified: $($models.Count) model entry or entries."
