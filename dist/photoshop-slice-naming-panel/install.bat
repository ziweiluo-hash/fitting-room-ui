@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
  echo.
  echo 安装失败，请截图此窗口内容后再处理。
  pause
)
endlocal
