[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$WorkflowPath,
    [switch]$RequireCiJobs
)

$ErrorActionPreference = 'Stop'
$content = Get-Content -LiteralPath $WorkflowPath -Raw
$failures = [System.Collections.Generic.List[string]]::new()

if ($content -match '(?im)^\s*pull_request_target\s*:') {
    $failures.Add('`pull_request_target` is forbidden for pull-request CI.')
}
if ($content -notmatch '(?im)^\s*pull_request\s*:') {
    $failures.Add('The workflow must trigger on `pull_request`.')
}
if ($content -match '(?i)\bsecrets\s*\.') {
    $failures.Add('PR workflows must not reference GitHub secrets.')
}
if ($content -notmatch '(?ms)^permissions:\s*\r?\n\s{2}contents:\s*read\s*$') {
    $failures.Add('Top-level permissions must be limited to `contents: read`.')
}
 $checkoutCount = [regex]::Matches($content, '(?im)^\s*-\s*uses:\s*actions/checkout@').Count
 $safeCheckoutCount = [regex]::Matches($content, '(?ms)-\s*uses:\s*actions/checkout@[^\r\n]+\r?\n\s+with:\s*\r?\n\s+persist-credentials:\s*false').Count
if ($checkoutCount -eq 0 -or $checkoutCount -ne $safeCheckoutCount) {
    $failures.Add('Checkout must disable persisted credentials.')
}
if ($content -notmatch '(?ms)^concurrency:\s*\r?\n\s+group:.*\r?\n\s+cancel-in-progress:\s*true\s*$') {
    $failures.Add('Workflow concurrency with cancellation is required.')
}
if ($RequireCiJobs) {
    foreach ($job in 'typecheck', 'lint', 'test', 'docker-smoke', 'model-manifest') {
        if ($content -notmatch "(?m)^  $([regex]::Escape($job)):") {
            $failures.Add("Missing required CI job: $job.")
        }
    }
    foreach ($job in 'typecheck', 'lint', 'test', 'docker-smoke', 'model-manifest') {
        $jobPattern = '(?ms)^  ' + [regex]::Escape($job) + ':\s*(.*?)(?=^  [a-z0-9-]+:|\z)'
        $jobBlock = [regex]::Match($content, $jobPattern)
        if ($jobBlock.Success -and $jobBlock.Value -notmatch '(?m)^    timeout-minutes:\s*\d+\s*$') {
            $failures.Add("CI job '$job' must declare timeout-minutes.")
        }
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Workflow safety check passed: $WorkflowPath"
