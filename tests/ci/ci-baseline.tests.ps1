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
    'node --check relay/server.mjs',
    'node --check tests/relay/deployment.test.mjs',
    'node --check tests/relay/relay.test.mjs',
    'node --test tests/relay/*.test.mjs'
)) {
    if (-not $content.Contains($command)) {
        throw "Expected repository-appropriate CI command: $command"
    }
}

if ($content -match '(?im)^\s*- run: pnpm ' -or $content -match '(?im)^\s*cache: pnpm\s*$') {
    throw 'The documentation-only baseline must not require an untracked pnpm manifest or lockfile.'
}

Write-Host 'AC-A-M0-04-05: Typecheck, Lint, and Test use tracked dependency-free Node commands.'
