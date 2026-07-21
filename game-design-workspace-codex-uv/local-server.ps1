$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = Join-Path $Root ".venv\Scripts\python.exe"
$scriptPath = Join-Path $Root "local-server.py"

if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
  throw "Python runtime not found: $pythonPath"
}

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
  throw "Python server script not found: $scriptPath"
}

$envPort = [Environment]::GetEnvironmentVariable("GAME_UX_BOARD_PORT")
$port = 8787

if ($args.Count -gt 0) {
  $argPort = 0
  if ([int]::TryParse([string]$args[0], [ref]$argPort) -and $argPort -gt 0) {
    $port = $argPort
  }
} elseif ($envPort) {
  $parsedPort = 0
  if ([int]::TryParse([string]$envPort, [ref]$parsedPort) -and $parsedPort -gt 0) {
    $port = $parsedPort
  }
}

$env:GAME_UX_BOARD_PORT = [string]$port

Write-Host "Game Design Workspace local server launcher"
Write-Host "  Root: $Root"
Write-Host "  Port: http://localhost:$port/"
Write-Host "  Runtime: $pythonPath"

& $pythonPath $scriptPath
exit $LASTEXITCODE
