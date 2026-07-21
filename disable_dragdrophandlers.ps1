$base = 'Registry::HKEY_CLASSES_ROOT\Folder\shellex\DragDropHandlers'
$disabled = 'Registry::HKEY_CLASSES_ROOT\Folder\shellex\DragDropHandlers_DisabledByCodex'

if (-not (Test-Path $disabled)) {
    New-Item -Path $disabled -Force | Out-Null
}

foreach ($name in @('WinRAR', 'WinRAR32')) {
    $src = Join-Path $base $name
    if (Test-Path $src) {
        $dst = Join-Path $disabled $name
        if (Test-Path $dst) {
            Remove-Item -Path $dst -Recurse -Force
        }
        Move-Item -Path $src -Destination $dst
    }
}
