$feSchema = Get-ChildItem -Path src/features -Recurse -Filter 'schema.ts' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\data\\schema\.ts$' }
$feSchemaCount = ($feSchema | Measure-Object).Count
Write-Output "FE_SCHEMA_FILES=$feSchemaCount"

$beModel = Get-ChildItem -Path server/models -Recurse -Filter '*.go' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch '_test\.go$' }
$beModelCount = ($beModel | Measure-Object).Count
Write-Output "BE_MODEL_FILES=$beModelCount"

$routes = Get-ChildItem -Path server/routes -Recurse -Filter '*.go' -ErrorAction SilentlyContinue
Write-Output ("BE_ROUTE_FILES=" + ($routes | Measure-Object).Count)

$handlers = Get-ChildItem -Path server/handlers -Recurse -Filter '*.go' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch '_test\.go$' }
Write-Output ("BE_HANDLER_FILES=" + ($handlers | Measure-Object).Count)

$services = Get-ChildItem -Path src/features -Recurse -Filter '*service*.ts' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch '\.test\.' }
Write-Output ("FE_SERVICE_FILES=" + ($services | Measure-Object).Count)

$tsFiles = Get-ChildItem -Path src -Recurse -Include *.ts, *.tsx -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch '\.test\.' }
$apiCalls = (Select-String -Path $tsFiles -Pattern 'apiFetch' -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Output "APIFETCH_CALLS=$apiCalls"

Write-Output "---"
$feSchema | ForEach-Object {
  $rel = $_.FullName.Replace($PWD.Path + '\', '')
  $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
  Write-Output ("FE_SCHEMA::" + $rel + "::" + $lines)
}
