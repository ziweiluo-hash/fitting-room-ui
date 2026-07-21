$ErrorActionPreference = "Stop"

$pluginId = "com.openai.photoshop.slice.naming.cep"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceRoot = Join-Path $scriptRoot "plugin\$pluginId"
$targetRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions\$pluginId"

if (-not (Test-Path $sourceRoot)) {
  throw "未找到插件源目录：$sourceRoot"
}

$photoshopProcess = Get-Process -Name Photoshop -ErrorAction SilentlyContinue
if ($photoshopProcess) {
  Write-Host "检测到 Photoshop 正在运行。为避免文件被占用，请先关闭 Photoshop 后再安装。" -ForegroundColor Yellow
  Read-Host "关闭 Photoshop 后按 Enter 继续"
}

New-Item -ItemType Directory -Path (Split-Path -Parent $targetRoot) -Force | Out-Null
if (Test-Path $targetRoot) {
  Remove-Item -LiteralPath $targetRoot -Recurse -Force
}
Copy-Item -LiteralPath $sourceRoot -Destination $targetRoot -Recurse -Force

$registryPaths = @(
  "HKCU:\Software\Adobe\CSXS.10",
  "HKCU:\Software\Adobe\CSXS.11",
  "HKCU:\Software\Adobe\CSXS.12"
)

foreach ($path in $registryPaths) {
  New-Item -Path $path -Force | Out-Null
  New-ItemProperty -Path $path -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
}

Write-Host ""
Write-Host "安装完成。" -ForegroundColor Green
Write-Host "插件位置：$targetRoot"
Write-Host "请重新打开 Photoshop，然后进入：窗口 > 扩展（旧版） > Slice Naming Panel"
Read-Host "按 Enter 关闭安装程序"
