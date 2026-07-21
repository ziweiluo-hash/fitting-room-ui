$pluginId = "com.openai.photoshop.slice.naming.cep"
$targetRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions\$pluginId"

$photoshopProcess = Get-Process -Name Photoshop -ErrorAction SilentlyContinue
if ($photoshopProcess) {
  Write-Host "检测到 Photoshop 正在运行。为避免文件被占用，请先关闭 Photoshop 后再卸载。" -ForegroundColor Yellow
  Read-Host "关闭 Photoshop 后按 Enter 继续"
}

if (Test-Path $targetRoot) {
  Remove-Item -LiteralPath $targetRoot -Recurse -Force
  Write-Host "插件已卸载：$targetRoot" -ForegroundColor Green
} else {
  Write-Host "未找到已安装的插件目录：$targetRoot" -ForegroundColor Yellow
}

Read-Host "按 Enter 关闭卸载程序"
