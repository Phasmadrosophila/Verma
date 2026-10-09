[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$requiredFiles = @(
  'docs/release/offline-proof.md',
  'docs/release/demo-rehearsal.md',
  'docs/release/evidence/rehearsal/README.md',
  'docs/release/evidence/rehearsal/run-01.md',
  'docs/release/evidence/rehearsal/run-02.md'
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Missing rehearsal artifact: $file"
  }
}

foreach ($run in @('docs/release/evidence/rehearsal/run-01.md', 'docs/release/evidence/rehearsal/run-02.md')) {
  $content = Get-Content -Raw -LiteralPath $run
  foreach ($term in @('Expected', 'Actual', 'Status', 'Timestamp', 'Operator', 'Build')) {
    if ($content -notmatch [regex]::Escape($term)) {
      throw "Rehearsal run record $run is missing required evidence field: $term"
    }
  }
  if ($content -notmatch 'OPEN') {
    throw "Human-required run record $run must retain an OPEN row until human verification."
  }
  if ($content -notmatch 'Synthetic-only') {
    throw "Human-required run record $run must declare the synthetic-only policy."
  }
}

Write-Host 'E-MR-03 AC-E-MR-03-04 PASS: rehearsal documentation includes required evidence fields and honest OPEN human checks.'
