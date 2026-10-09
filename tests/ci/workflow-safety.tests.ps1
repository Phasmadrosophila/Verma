param(
    [string]$Checker = "scripts/ci/check-workflow-safety.ps1"
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '../..')
$checkerPath = Join-Path $root $Checker
$safeFixture = Join-Path $PSScriptRoot 'fixtures/safe-pr-workflow.yml'
$unsafeFixture = Join-Path $PSScriptRoot 'fixtures/unsafe-pr-workflow.yml'

if (-not (Test-Path -LiteralPath $checkerPath)) {
    throw "Expected workflow safety checker at $checkerPath"
}

$powerShell = if ($PSVersionTable.PSEdition -eq 'Core') { 'pwsh' } else { 'powershell' }

& $powerShell -NoProfile -File $checkerPath -WorkflowPath $safeFixture
if ($LASTEXITCODE -ne 0) {
    throw 'Expected the safe workflow fixture to pass.'
}

& $powerShell -NoProfile -File $checkerPath -WorkflowPath $unsafeFixture 2>$null
if ($LASTEXITCODE -eq 0) {
    throw 'Expected the unsafe workflow fixture to fail.'
}

Write-Host 'AC-A-M0-04-01: workflow safety checker accepts the safe fixture and rejects the unsafe fixture.'
