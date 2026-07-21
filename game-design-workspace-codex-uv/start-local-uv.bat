@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=%GAME_UX_BOARD_PORT%"
if "%PORT%"=="" (
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$used=@{}; foreach($ep in [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()){ $used[$ep.Port]=$true }; foreach($candidate in 8787..8899){ if(-not $used.ContainsKey($candidate)){ $candidate; break } }"`) do set "PORT=%%P"
)
if "%PORT%"=="" set "PORT=8787"
set "GAME_UX_BOARD_PORT=%PORT%"
set "URL=http://localhost:%PORT%/"

where uv >nul 2>nul
if errorlevel 1 (
  echo uv is not installed or is not on PATH.
  echo Install uv first:
  echo   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  echo.
  pause
  exit /b 1
)

echo ========================================
echo 游戏设计工作台 / Game Design Workspace
echo Runtime: uv
echo URL: %URL%
echo ========================================
echo.

set "HTTP_PROXY="
set "HTTPS_PROXY="
set "ALL_PROXY="
set "http_proxy="
set "https_proxy="
set "all_proxy="
set "NO_PROXY=localhost,127.0.0.1,::1"
set "no_proxy=localhost,127.0.0.1,::1"

echo [1/3] Preparing Python with uv...
uv sync
if errorlevel 1 (
  echo uv sync failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Checking .env...
if not exist ".env" (
  echo .env does not exist. Creating it from .env.example.
  copy ".env.example" ".env" >nul
  echo.
  echo Please edit .env and fill BABYLON_JWT_TOKEN, then run this file again.
  pause
  exit /b 1
)

findstr /C:"your-babylon-jwt-token-here" ".env" >nul 2>nul
if not errorlevel 1 (
  echo BABYLON_JWT_TOKEN still uses the placeholder value in .env.
  echo Please edit .env and fill a valid Babylon JWT token.
  pause
  exit /b 1
)

echo.
echo [3/3] Starting local server...
echo Keep this window open while using Game Design Workspace.
echo Open %URL% in Chrome or Edge.
echo.
start "" "%URL%"
uv run python local-server.py

pause
