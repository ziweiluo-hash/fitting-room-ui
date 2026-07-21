@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "APP_DIR=%~dp0game-design-workspace-codex-uv"

if not exist "%APP_DIR%\start-local.bat" (
  echo Cannot find launcher:
  echo   %APP_DIR%\start-local.bat
  echo.
  echo Please make sure game-design-workspace-codex-uv exists in this project.
  pause
  exit /b 1
)

echo Starting workspace from:
echo   %APP_DIR%
echo.
call "%APP_DIR%\start-local.bat" %*
