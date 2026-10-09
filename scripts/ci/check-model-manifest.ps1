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
    $modelId = [string]$model.id
    if ([string]::IsNullOrWhiteSpace($modelId)) {
        throw 'Model manifest entry is missing required id.'
    }

    # Candidate models are represented by the documented `tbd` status and
    # literal TBD detail values. They have no artifact to pin in CI yet.
    if ($model.status -eq 'tbd') {
        foreach ($property in 'model_name', 'version', 'sha256', 'license', 'source_url', 'artifact_path', 'redistribution_review') {
            if ([string]$model.$property -ne 'TBD') {
                throw "TBD model manifest entry '$modelId' must use literal TBD for '$property'."
            }
        }
        continue
    }

    if ($model.status -ne 'selected') {
        throw "Model manifest entry '$modelId' must have status tbd or selected."
    }

    foreach ($property in 'model_name', 'version', 'sha256', 'license', 'source_url', 'artifact_path', 'redistribution_review') {
        $value = [string]$model.$property
        if ([string]::IsNullOrWhiteSpace($value) -or $value -eq 'TBD') {
            throw "Selected model manifest entry '$modelId' is missing a non-TBD '$property'."
        }
    }
    if ([string]$model.sha256 -cnotmatch '^[a-f0-9]{64}$') {
        throw "Selected model manifest entry '$modelId' sha256 must be a lowercase 64-character hexadecimal digest."
    }
}

Write-Host "Model manifest verified: $($models.Count) model entry or entries."
