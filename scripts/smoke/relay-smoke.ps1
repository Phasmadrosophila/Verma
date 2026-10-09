[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://localhost:8080',
  [Parameter(Mandatory = $true)][string]$RelayToken
)

$headers = @{ Authorization = "Bearer $RelayToken" }
$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
if ($health.status -ne 'ok') { throw 'Relay health check failed.' }

$id = 'smoke-envelope-01'
$payload = [System.Text.Encoding]::UTF8.GetBytes('synthetic-encrypted-envelope-v1:4c61e8b3')
$storeHeaders = @{ Authorization = "Bearer $RelayToken"; 'Content-Type' = 'application/octet-stream'; 'X-Verma-Envelope-Version' = '1' }
Invoke-WebRequest -Uri "$BaseUrl/v1/envelopes/$id" -Method Post -Headers $storeHeaders -Body $payload | Out-Null
$list = Invoke-RestMethod -Uri "$BaseUrl/v1/envelopes" -Headers $headers
if ($list.envelopes.id -notcontains $id) { throw 'Stored envelope was absent from the list.' }
$fetched = Invoke-WebRequest -Uri "$BaseUrl/v1/envelopes/$id" -Headers $headers
if (-not [System.Linq.Enumerable]::SequenceEqual([byte[]]$payload, [byte[]]$fetched.Content)) { throw 'Fetched envelope differs from stored bytes.' }
Write-Output 'Relay smoke passed: authenticated opaque envelope store, list, and fetch.'
