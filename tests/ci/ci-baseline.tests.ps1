param(
    [string]$WorkflowPath = '.github/workflows/pull-request-ci.yml'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '../..')
$path = Join-Path $root $WorkflowPath

if (-not (Test-Path -LiteralPath $path)) {
    throw "Expected pull-request CI workflow at $path"
}

$content = Get-Content -LiteralPath $path -Raw
foreach ($job in 'typecheck', 'lint', 'test') {
    if ($content -notmatch "(?m)^  ${job}:") {
        throw "Expected executable $job job in pull-request CI."
    }
}

foreach ($command in @(
    'corepack enable pnpm',
    'pnpm install --frozen-lockfile',
    'pnpm run check'
)) {
    if (-not $content.Contains($command)) {
        throw "Expected workspace CI command: $command"
    }
}

Write-Host 'AC-A-M0-04-05: Typecheck, Lint, and Test use the tracked pnpm workspace commands.'
