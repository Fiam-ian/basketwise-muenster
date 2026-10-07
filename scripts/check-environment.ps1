param([switch]$RunTests)
$ErrorActionPreference = 'Stop'
$taskPrototypeRoot = Split-Path -Parent $PSScriptRoot
Write-Output ("Prototype folder: " + $taskPrototypeRoot)
foreach ($relative in @('package.json', 'index.html', 'preview.html', 'src\optimizer.mjs')) {
  Write-Output ($relative + ': ' + (Test-Path -LiteralPath (Join-Path $taskPrototypeRoot $relative)))
}
$taskNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$taskNodeExecutable = if ($taskNodeCommand) { $taskNodeCommand.Source } else {
  Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $taskNodeExecutable)) {
  throw 'Node.js was not found on PATH or in the known desktop runtime bundle. Report this result; no tools were installed.'
}
Write-Output ("Node executable: " + $taskNodeExecutable)
& $taskNodeExecutable --version
if ($LASTEXITCODE -ne 0) { throw 'Node could not start.' }
foreach ($toolName in @('git', 'gh')) {
  $taskToolCommand = Get-Command $toolName -ErrorAction SilentlyContinue
  Write-Output ($toolName + ' on PATH: ' + [bool]$taskToolCommand)
}
if ($RunTests) {
  Push-Location -LiteralPath $taskPrototypeRoot
  try {
    & $taskNodeExecutable --test
    if ($LASTEXITCODE -ne 0) { throw 'The canonical Node test run failed.' }
  } finally { Pop-Location }
} else {
  Write-Output 'Read-only environment check complete. Add -RunTests to run canonical tests.'
}
Write-Output 'This does not change Codex settings, shell policy, credentials or package installations.'
