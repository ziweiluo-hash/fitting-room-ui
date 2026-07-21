@echo off
cd /d "%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=%GAME_UX_BOARD_PORT%"
if "%PORT%"=="" (
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$used=@{}; foreach($ep in [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()){ $used[$ep.Port]=$true }; foreach($candidate in 8787..8899){ if(-not $used.ContainsKey($candidate)){ $candidate; break } }"`) do set "PORT=%%P"
)
if "%PORT%"=="" set "PORT=8787"
set "GAME_UX_BOARD_PORT=%PORT%"
echo Starting Game Design Workspace at http://localhost:%PORT%/
if exist "%~dp0.venv\Scripts\python.exe" (
  start "" "http://localhost:%PORT%/"
  "%~dp0.venv\Scripts\python.exe" "%~dp0local-server.py"
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%/"
  py -3 "%~dp0local-server.py"
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%/"
  python "%~dp0local-server.py"
  goto :eof
)

start "" "http://localhost:%PORT%/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-server.ps1" "%PORT%"
