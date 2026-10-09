param(
    [string]$Checker = "scripts/ci/check-model-manifest.ps1"
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '../..')
$checkerPath = Join-Path $root $Checker

if (-not (Test-Path -LiteralPath $checkerPath)) {
    throw "Expected model manifest checker at $checkerPath"
}

$powerShell = if ($PSVersionTable.PSEdition -eq 'Core') { 'pwsh' } else { 'powershell' }
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("verma-model-manifest-test-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
    $tbdManifest = @{
        schema_version = '1.0'
        models = @(@{
            id = 'synthetic-candidate'
            status = 'tbd'
            model_name = 'TBD'
            version = 'TBD'
            sha256 = 'TBD'
            license = 'TBD'
            source_url = 'TBD'
            artifact_path = 'TBD'
            redistribution_review = 'TBD'
        })
    }
    $selectedManifest = @{
        schema_version = '1.0'
        models = @(@{
            id = 'synthetic-pinned'
            status = 'selected'
            model_name = 'synthetic/model'
            version = '1.0.0'
            sha256 = ('a' * 64)
            license = 'Synthetic-Test-License'
            source_url = 'https://example.invalid/model'
            artifact_path = 'synthetic.gguf'
            redistribution_review = 'synthetic test review'
        })
    }

    $tbdPath = Join-Path $temporaryDirectory 'candidate-tbd.json'
    $selectedPath = Join-Path $temporaryDirectory 'selected.json'
    $invalidHashPath = Join-Path $temporaryDirectory 'selected-invalid-hash.json'
    $invalidLicensePath = Join-Path $temporaryDirectory 'selected-invalid-license.json'
    $tbdManifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $tbdPath -Encoding utf8
    $selectedManifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $selectedPath -Encoding utf8

    $invalidHashManifest = $selectedManifest | ConvertTo-Json -Depth 4 | ConvertFrom-Json
    $invalidHashManifest.models[0].sha256 = ('A' * 64)
    $invalidHashManifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $invalidHashPath -Encoding utf8

    $invalidLicenseManifest = $selectedManifest | ConvertTo-Json -Depth 4 | ConvertFrom-Json
    $invalidLicenseManifest.models[0].license = 'TBD'
    $invalidLicenseManifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $invalidLicensePath -Encoding utf8

    foreach ($passingFixture in $tbdPath, $selectedPath) {
        & $powerShell -NoProfile -File $checkerPath -ManifestPath $passingFixture
        if ($LASTEXITCODE -ne 0) {
            throw "Expected model manifest fixture '$passingFixture' to pass."
        }
    }

    foreach ($failingFixture in $invalidHashPath, $invalidLicensePath) {
        $oldErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        $failureOutput = & $powerShell -NoProfile -File $checkerPath -ManifestPath $failingFixture 2>&1
        $ErrorActionPreference = $oldErrorActionPreference
        if ($LASTEXITCODE -eq 0) {
            throw "Expected invalid model manifest fixture '$failingFixture' to fail."
        }
    }
}
finally {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
}

Write-Host 'AC-A-M0-04-02: model manifest checker accepts intentional TBD candidates and valid pinned entries, and rejects incomplete pinned entries.'
